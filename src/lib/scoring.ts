import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase/client";

/**
 * Sets one team's raw score for a round, applying the double-points
 * multiplier if they picked this round. Uses setDoc with merge so this
 * only touches this one team's entry in the round's scores doc, leaving
 * every other team's entry untouched - a plain updateDoc({ entries: {...} })
 * would instead replace the whole entries map.
 */
export async function setRoundScore(
  quizId: string,
  roundId: string,
  teamId: string,
  raw: number,
  isDoubled: boolean
): Promise<void> {
  await setDoc(
    doc(db, "quizzes", quizId, "scores", roundId),
    {
      entries: {
        [teamId]: { raw, isDoubled, points: isDoubled ? raw * 2 : raw },
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Marks a team correct on The Long Game for the given round, locking in
 * their points at (liveRealRoundCount - roundPosition + 1).
 *
 * `roundPosition` must be the round's 1-indexed *position* among sorted
 * real rounds (1st round = 1, 2nd = 2, ...) - NOT Round.order, which is a
 * gapped sort key (10, 20, 30, ...) and would badly wrong the formula for
 * any round past the first. `liveRealRoundCount` must likewise be the
 * *current* count of real rounds, not a cached/stored value - see the
 * "numRounds can drift" note in the plan doc.
 */
export async function markLongGameCorrect(
  quizId: string,
  teamId: string,
  roundPosition: number,
  liveRealRoundCount: number
): Promise<void> {
  await setDoc(doc(db, "quizzes", quizId, "longGame", teamId), {
    correctRoundPosition: roundPosition,
    pointsAwarded: liveRealRoundCount - roundPosition + 1,
    lockedAt: serverTimestamp(),
  });
}

/** Undoes a Long Game correct-mark, e.g. if the host misclicked. */
export async function clearLongGameResult(quizId: string, teamId: string): Promise<void> {
  await setDoc(doc(db, "quizzes", quizId, "longGame", teamId), {
    correctRoundPosition: null,
    pointsAwarded: null,
    lockedAt: null,
  });
}
