import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { generateQuizCode } from "@/lib/codeGen";
import { db } from "@/lib/firebase/client";
import { newQuestionFields, normaliseQuestion, type Question } from "@/lib/types/question";
import { newRoundFields, normaliseRound } from "@/lib/types/round";

export interface CreateQuizInput {
  title: string;
  date: Date;
  // How many rounds to scaffold immediately, so the host doesn't have to
  // add them one at a time. More can be added/removed afterwards - this
  // only sets the starting point.
  numRounds: number;
  longGameEnabled: boolean;
  // Points for a correct Long Game guess at round 1, decreasing to 1 by
  // the last round - see calculateLongGamePoints in lib/scoring.ts.
  // Ignored (but still stored, so it doesn't matter what's passed) when
  // longGameEnabled is false.
  longGameMaxPoints: number;
  doublePointsEnabled: boolean;
  doublePointsPicksPerTeam: number;
  hostUid: string;
}

// Thrown internally when a randomly generated code turns out to already be
// taken, so createQuiz knows to retry with a fresh one rather than fail.
class CodeCollisionError extends Error {}

const MAX_CODE_ATTEMPTS = 5;

/**
 * Creates a new quiz: generates a unique short code and writes the quiz
 * document plus its quizCodes lookup entry, then scaffolds the requested
 * number of empty rounds (titled "Round 1", "Round 2", ...) as a follow-up
 * step.
 *
 * Deliberately two steps rather than one transaction: a round's security
 * rule reads the parent quiz to check the host, but rules see the
 * database as it was when the transaction started - so a quiz created in
 * that same transaction would look absent and the write would be
 * rejected. If the rounds step fails the quiz still exists and rounds can
 * be added by hand.
 *
 * Retries with a fresh code (up to MAX_CODE_ATTEMPTS) if one is taken.
 */
export async function createQuiz(
  input: CreateQuizInput
): Promise<{ quizId: string; code: string }> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateQuizCode();
    const quizRef = doc(collection(db, "quizzes"));
    const quizCodeRef = doc(db, "quizCodes", code);

    try {
      await runTransaction(db, async (transaction) => {
        // Firestore requires all reads before any writes in a transaction,
        // so the collision check has to happen first.
        const existingCode = await transaction.get(quizCodeRef);
        if (existingCode.exists()) {
          throw new CodeCollisionError();
        }

        transaction.set(quizCodeRef, { quizId: quizRef.id });

        transaction.set(quizRef, {
          title: input.title,
          date: Timestamp.fromDate(input.date),
          code,
          hostUid: input.hostUid,
          numRounds: input.numRounds,
          longGameEnabled: input.longGameEnabled,
          longGameFinalAnswer: "",
          longGameMaxPoints: input.longGameMaxPoints,
          doublePointsEnabled: input.doublePointsEnabled,
          doublePointsPicksPerTeam: input.doublePointsPicksPerTeam,
          status: "setup",
          archived: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      if (error instanceof CodeCollisionError) {
        continue;
      }
      throw error;
    }

    // The quiz doc is now committed, so the rounds'/questions' security
    // rules can successfully look it up to confirm hostUid.
    const batch = writeBatch(db);
    for (let i = 0; i < input.numRounds; i++) {
      const roundRef = doc(collection(db, "quizzes", quizRef.id, "rounds"));
      // Gapped values (10, 20, 30, ...) so later reordering only ever
      // has to touch the 1-2 rounds a drag moved past.
      batch.set(roundRef, newRoundFields({ order: (i + 1) * 10, title: `Round ${i + 1}` }));
    }

    if (input.longGameEnabled) {
      // The Long Game is modeled as its own round (see Round.isLongGame),
      // with one clue per real round stored as that round's "questions" -
      // this reuses the same CRUD/reorder/hooks as normal questions
      // instead of a parallel set of types and functions. Scaffolded with
      // exactly numRounds empty clue slots to match, same as the real
      // rounds above.
      const longGameRoundRef = doc(collection(db, "quizzes", quizRef.id, "rounds"));
      batch.set(
        longGameRoundRef,
        newRoundFields({ order: 0, title: "The Long Game", isLongGame: true })
      );

      for (let i = 0; i < input.numRounds; i++) {
        const clueRef = doc(
          collection(db, "quizzes", quizRef.id, "rounds", longGameRoundRef.id, "questions")
        );
        batch.set(clueRef, newQuestionFields({ order: (i + 1) * 10 }));
      }
    }

    await batch.commit();

    return { quizId: quizRef.id, code };
  }

  throw new Error("Could not generate a unique quiz code after several attempts.");
}

/** Marks a quiz as archived - the only form of "delete" in v1 (see plan doc for why). */
export async function archiveQuiz(quizId: string): Promise<void> {
  await updateDoc(doc(db, "quizzes", quizId), {
    archived: true,
    updatedAt: serverTimestamp(),
  });
}

export async function unarchiveQuiz(quizId: string): Promise<void> {
  await updateDoc(doc(db, "quizzes", quizId), {
    archived: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Clones a quiz - every round and every question/clue, exactly as-is -
 * into a brand new quiz with its own fresh code. Same two-phase
 * create-then-scaffold approach as createQuiz, for the same
 * security-rules reason (rounds/questions need the quiz doc to already
 * exist so their write rules can look up hostUid).
 *
 * Media isn't copied in Storage - cloned questions keep pointing at the
 * original quiz's paths. Safe because quizzes are only ever archived,
 * never hard-deleted, so those files can't vanish from under the clone.
 */
export async function duplicateQuiz(
  quizId: string,
  hostUid: string
): Promise<{ quizId: string; code: string }> {
  const sourceQuizSnap = await getDoc(doc(db, "quizzes", quizId));
  if (!sourceQuizSnap.exists()) {
    throw new Error("Quiz not found.");
  }
  const sourceQuiz = sourceQuizSnap.data();

  const sourceRoundsSnap = await getDocs(collection(db, "quizzes", quizId, "rounds"));
  // Normalised on the way in, so anything these documents predate is
  // filled once here rather than guarded again at every write below.
  const sourceRounds = sourceRoundsSnap.docs.map((d) => normaliseRound(d.id, d.data()));

  const questionsByRoundId: Record<string, Question[]> = {};
  for (const round of sourceRounds) {
    const questionsSnap = await getDocs(
      collection(db, "quizzes", quizId, "rounds", round.id, "questions")
    );
    questionsByRoundId[round.id] = questionsSnap.docs.map((d) =>
      normaliseQuestion(d.id, d.data())
    );
  }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateQuizCode();
    const newQuizRef = doc(collection(db, "quizzes"));
    const quizCodeRef = doc(db, "quizCodes", code);

    try {
      await runTransaction(db, async (transaction) => {
        const existingCode = await transaction.get(quizCodeRef);
        if (existingCode.exists()) {
          throw new CodeCollisionError();
        }

        transaction.set(quizCodeRef, { quizId: newQuizRef.id });
        transaction.set(newQuizRef, {
          title: `${sourceQuiz.title} (Copy)`,
          date: sourceQuiz.date,
          code,
          hostUid,
          numRounds: sourceQuiz.numRounds,
          longGameEnabled: sourceQuiz.longGameEnabled,
          longGameFinalAnswer: sourceQuiz.longGameFinalAnswer,
          longGameMaxPoints: sourceQuiz.longGameMaxPoints,
          doublePointsEnabled: sourceQuiz.doublePointsEnabled,
          doublePointsPicksPerTeam: sourceQuiz.doublePointsPicksPerTeam,
          status: "setup",
          archived: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      if (error instanceof CodeCollisionError) {
        continue;
      }
      throw error;
    }

    const batch = writeBatch(db);
    for (const round of sourceRounds) {
      const newRoundRef = doc(collection(db, "quizzes", newQuizRef.id, "rounds"));
      batch.set(newRoundRef, newRoundFields(round));

      for (const question of questionsByRoundId[round.id] ?? []) {
        const newQuestionRef = doc(
          collection(db, "quizzes", newQuizRef.id, "rounds", newRoundRef.id, "questions")
        );
        batch.set(newQuestionRef, newQuestionFields(question));
      }
    }
    await batch.commit();

    return { quizId: newQuizRef.id, code };
  }

  throw new Error("Could not generate a unique quiz code after several attempts.");
}
