import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { generateQuizCode } from "@/lib/codeGen";
import { db } from "@/lib/firebase/client";

export interface CreateQuizInput {
  title: string;
  date: Date;
  // How many rounds to scaffold immediately, so the host doesn't have to
  // add them one at a time. More can be added/removed afterwards - this
  // only sets the starting point.
  numRounds: number;
  longGameEnabled: boolean;
  doublePointsEnabled: boolean;
  doublePointsPicksPerTeam: number;
  hostUid: string;
}

// Thrown internally when a randomly generated code turns out to already be
// taken, so createQuiz knows to retry with a fresh one rather than fail.
class CodeCollisionError extends Error {}

const MAX_CODE_ATTEMPTS = 5;

/**
 * Creates a new quiz: generates a unique short code, writes the quiz
 * document and its quizCodes lookup entry, and scaffolds the requested
 * number of empty rounds (titled "Round 1", "Round 2", ...) - all in one
 * atomic transaction, so nothing is left half-created if it fails partway.
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
          doublePointsEnabled: input.doublePointsEnabled,
          doublePointsPicksPerTeam: input.doublePointsPicksPerTeam,
          status: "setup",
          archived: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        for (let i = 0; i < input.numRounds; i++) {
          const roundRef = doc(collection(db, "quizzes", quizRef.id, "rounds"));
          transaction.set(roundRef, {
            // Gapped values (10, 20, 30, ...) so later reordering only
            // ever has to touch the 1-2 rounds a drag moved past.
            order: (i + 1) * 10,
            title: `Round ${i + 1}`,
            longGameClueText: null,
            longGameClueImagePath: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });

      return { quizId: quizRef.id, code };
    } catch (error) {
      if (error instanceof CodeCollisionError) {
        continue;
      }
      throw error;
    }
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
