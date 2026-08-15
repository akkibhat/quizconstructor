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
import type { Question } from "@/lib/types/question";
import type { Round } from "@/lib/types/round";

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
 * This is deliberately NOT one single transaction covering the rounds too.
 * The round documents' security rule needs to `get()` the parent quiz doc
 * to confirm the caller is its host - but rules evaluate against the
 * state of the database as of the *start* of a transaction, so if the
 * quiz doc were being created in that same transaction, the rule would
 * see it as not existing yet and reject the write. Creating the quiz
 * first (so it's genuinely committed) and then scaffolding rounds as a
 * separate batch avoids that chicken-and-egg problem. If the round
 * scaffolding step were to fail, the quiz still exists and rounds can be
 * added manually via "Add Round" - not a scenario worth full rollback
 * complexity for a personal tool.
 *
 * Retries with a new random code (up to MAX_CODE_ATTEMPTS times) if the
 * chosen code happens to already be in use.
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
      batch.set(roundRef, {
        // Gapped values (10, 20, 30, ...) so later reordering only ever
        // has to touch the 1-2 rounds a drag moved past.
        order: (i + 1) * 10,
        title: `Round ${i + 1}`,
        isLongGame: false,
        roundType: "standard",
        listPrompt: null,
        listAnswerReference: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (input.longGameEnabled) {
      // The Long Game is modeled as its own round (see Round.isLongGame),
      // with one clue per real round stored as that round's "questions" -
      // this reuses the same CRUD/reorder/hooks as normal questions
      // instead of a parallel set of types and functions. Scaffolded with
      // exactly numRounds empty clue slots to match, same as the real
      // rounds above.
      const longGameRoundRef = doc(collection(db, "quizzes", quizRef.id, "rounds"));
      batch.set(longGameRoundRef, {
        order: 0,
        title: "The Long Game",
        isLongGame: true,
        roundType: "standard",
        listPrompt: null,
        listAnswerReference: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      for (let i = 0; i < input.numRounds; i++) {
        const clueRef = doc(
          collection(db, "quizzes", quizRef.id, "rounds", longGameRoundRef.id, "questions")
        );
        batch.set(clueRef, {
          order: (i + 1) * 10,
          text: "",
          answer: "",
          points: 1,
          imagePath: null,
          audioPath: null,
          audioPlayMode: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
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
 * Media (images/audio) is NOT copied in Storage - the cloned question
 * docs keep pointing at the *original* quiz's Storage paths. This is
 * deliberate, not an oversight: quizzes are only ever archived, never
 * hard-deleted (see the note on Quiz.archived), so the original's files
 * are never at risk of disappearing out from under the clone. Copying the
 * actual file bytes would mean downloading and re-uploading every image
 * and audio file for no real benefit.
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
  const sourceRounds = sourceRoundsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Round, "id">),
  }));

  const questionsByRoundId: Record<string, Question[]> = {};
  for (const round of sourceRounds) {
    const questionsSnap = await getDocs(
      collection(db, "quizzes", quizId, "rounds", round.id, "questions")
    );
    questionsByRoundId[round.id] = questionsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Question, "id">),
    }));
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
      batch.set(newRoundRef, {
        order: round.order,
        title: round.title,
        isLongGame: round.isLongGame,
        // Defensively defaulted - these fields were added after some test
        // data existed, and Firestore rejects `undefined` in a write.
        roundType: round.roundType ?? "standard",
        listPrompt: round.listPrompt ?? null,
        listAnswerReference: round.listAnswerReference ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      for (const question of questionsByRoundId[round.id] ?? []) {
        const newQuestionRef = doc(
          collection(db, "quizzes", newQuizRef.id, "rounds", newRoundRef.id, "questions")
        );
        batch.set(newQuestionRef, {
          order: question.order,
          text: question.text,
          answer: question.answer,
          // Defensively defaulted - added after some test data existed.
          points: question.points ?? 1,
          imagePath: question.imagePath,
          audioPath: question.audioPath,
          audioPlayMode: question.audioPlayMode,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
    await batch.commit();

    return { quizId: newQuizRef.id, code };
  }

  throw new Error("Could not generate a unique quiz code after several attempts.");
}
