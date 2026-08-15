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
 * Points for a correct Long Game guess at a given round position. Spreads
 * evenly from `maxPoints` at round 1 down to exactly `1` at the last
 * round, whatever `maxPoints` and `numRounds` are - e.g. maxPoints=10 over
 * 8 rounds gives 10, 9, 7, 6, 5, 4, 2, 1. Pinning both endpoints exactly
 * (round 1 = maxPoints, last round = 1) is deliberate: it guarantees the
 * last round is always the near-free "everyone should get this" catch-up
 * moment, regardless of how maxPoints/numRounds are configured - a plain
 * constant step size (maxPoints / numRounds) can't promise that (e.g. 10
 * over 3 rounds would leave the last round worth 3, not 1).
 *
 * `roundPosition` must be the round's 1-indexed *position* among sorted
 * real rounds (1st round = 1, 2nd = 2, ...) - NOT Round.order, which is a
 * gapped sort key (10, 20, 30, ...) and would badly wrong this for any
 * round past the first. `numRounds` must likewise be the *current* count
 * of real rounds, not a cached/stored value - see the "numRounds can
 * drift" note in the plan doc.
 */
export function calculateLongGamePoints(
  roundPosition: number,
  numRounds: number,
  maxPoints: number
): number {
  if (numRounds <= 1) {
    // Only one round to guess in at all - it's simultaneously the first
    // and the last, so there's no range to spread across.
    return maxPoints;
  }
  const stepPerRound = (maxPoints - 1) / (numRounds - 1);
  return Math.round(maxPoints - (roundPosition - 1) * stepPerRound);
}

/** Marks a team correct on The Long Game for the given round, locking in their points. */
export async function markLongGameCorrect(
  quizId: string,
  teamId: string,
  roundPosition: number,
  numRounds: number,
  maxPoints: number
): Promise<void> {
  await setDoc(doc(db, "quizzes", quizId, "longGame", teamId), {
    correctRoundPosition: roundPosition,
    pointsAwarded: calculateLongGamePoints(roundPosition, numRounds, maxPoints),
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
