import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { Round } from "@/lib/types/round";

/** Adds a new round at the end of the quiz's round list. */
export async function addRound(quizId: string, existingRounds: Round[]): Promise<void> {
  const highestOrder = existingRounds.reduce((max, round) => Math.max(max, round.order), 0);
  const roundRef = doc(collection(db, "quizzes", quizId, "rounds"));

  const batch = writeBatch(db);
  batch.set(roundRef, {
    order: highestOrder + 10,
    title: `Round ${existingRounds.length + 1}`,
    longGameClueText: null,
    longGameClueImagePath: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, "quizzes", quizId), {
    numRounds: existingRounds.length + 1,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function updateRound(
  quizId: string,
  roundId: string,
  updates: Partial<Pick<Round, "title" | "longGameClueText" | "longGameClueImagePath">>
): Promise<void> {
  await updateDoc(doc(db, "quizzes", quizId, "rounds", roundId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a round and everything under it. Firestore doesn't cascade-delete
 * subcollections, so the round's questions have to be removed explicitly
 * first - otherwise they'd become permanently unreachable orphans (not
 * even visible in the Firebase console's default views).
 */
export async function deleteRound(
  quizId: string,
  roundId: string,
  remainingRoundCount: number
): Promise<void> {
  const questionsSnapshot = await getDocs(
    collection(db, "quizzes", quizId, "rounds", roundId, "questions")
  );

  const batch = writeBatch(db);
  for (const questionDoc of questionsSnapshot.docs) {
    batch.delete(questionDoc.ref);
  }
  batch.delete(doc(db, "quizzes", quizId, "rounds", roundId));
  batch.update(doc(db, "quizzes", quizId), {
    numRounds: remainingRoundCount,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

/**
 * Moves a round up or down by one position by swapping its `order` value
 * with its neighbor's. Swapping (rather than computing a midpoint order,
 * or renumbering) keeps this simple and always valid - there's no
 * "ran out of room between two adjacent values" edge case to handle.
 */
export async function swapRoundOrder(
  quizId: string,
  roundA: Round,
  roundB: Round
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "quizzes", quizId, "rounds", roundA.id), {
    order: roundB.order,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, "quizzes", quizId, "rounds", roundB.id), {
    order: roundA.order,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}
