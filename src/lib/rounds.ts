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

/** Adds a new standard round at the end of the quiz's round list. */
export async function addRound(quizId: string, existingRounds: Round[]): Promise<void> {
  const highestOrder = existingRounds.reduce((max, round) => Math.max(max, round.order), 0);
  const roundRef = doc(collection(db, "quizzes", quizId, "rounds"));

  const batch = writeBatch(db);
  batch.set(roundRef, {
    order: highestOrder + 10,
    title: `Round ${existingRounds.length + 1}`,
    isLongGame: false,
    roundType: "standard",
    listPrompt: null,
    listAnswerReference: null,
    flavour: "standard",
    themeNote: null,
    answerPool: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, "quizzes", quizId), {
    numRounds: existingRounds.length + 1,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

/** Thrown by addListRound when a quiz already has a Gauntlet round - only one is allowed per quiz. */
export class ListRoundAlreadyExistsError extends Error {}

/**
 * Adds The Gauntlet - the special single-prompt round (roundType "list"
 * internally, see Round.roundType) - at the end of the quiz's round list.
 * The host can then drag it to wherever they want (e.g. the middle,
 * before a drinks break) using the normal up/down reorder controls, same
 * as any other round.
 */
export async function addListRound(quizId: string, existingRounds: Round[]): Promise<void> {
  if (existingRounds.some((round) => round.roundType === "list")) {
    throw new ListRoundAlreadyExistsError("This quiz already has a Gauntlet round.");
  }

  const highestOrder = existingRounds.reduce((max, round) => Math.max(max, round.order), 0);
  const roundRef = doc(collection(db, "quizzes", quizId, "rounds"));

  const batch = writeBatch(db);
  batch.set(roundRef, {
    order: highestOrder + 10,
    title: "The Gauntlet",
    isLongGame: false,
    roundType: "list",
    listPrompt: null,
    listAnswerReference: null,
    flavour: "standard",
    themeNote: null,
    answerPool: null,
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
  updates: Partial<
    Pick<
      Round,
      "title" | "listPrompt" | "listAnswerReference" | "flavour" | "themeNote" | "answerPool"
    >
  >
): Promise<void> {
  await updateDoc(doc(db, "quizzes", quizId, "rounds", roundId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/** Thrown by deleteRound when doing so would leave fewer rounds than the Long Game has clues. */
export class TooFewRoundsForLongGameError extends Error {}

/**
 * Deletes a round and everything under it. Firestore doesn't cascade-delete
 * subcollections, so the round's questions have to be removed explicitly
 * first - otherwise they'd become permanently unreachable orphans (not
 * even visible in the Firebase console's default views).
 *
 * Refuses to delete (throwing TooFewRoundsForLongGameError) if the
 * resulting round count would be less than the Long Game's current clue
 * count. This is deliberate: rather than silently guessing which clue to
 * drop, the host has to go trim The Long Game themselves first, so they
 * choose which clue goes.
 */
export async function deleteRound(
  quizId: string,
  roundId: string,
  remainingRoundCount: number,
  longGameClueCount: number
): Promise<void> {
  if (longGameClueCount > remainingRoundCount) {
    throw new TooFewRoundsForLongGameError(
      `The Long Game currently has ${longGameClueCount} clue${longGameClueCount === 1 ? "" : "s"}, but this quiz would only have ${remainingRoundCount} round${remainingRoundCount === 1 ? "" : "s"} left. Remove a clue from The Long Game first.`
    );
  }

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
