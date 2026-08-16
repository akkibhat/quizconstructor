import { collection, doc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { ContestedPosition } from "@/lib/types/liveState";
import type { TiebreakResult } from "@/lib/types/tiebreakResult";

function resultsCollection(quizId: string) {
  return collection(db, "quizzes", quizId, "tiebreakResults");
}

/**
 * Records the finishing order of a resolved tiebreak: the teams in
 * `orderedTeamIds` get ranks 0, 1, 2... in the order given (best first).
 *
 * Also clears any earlier result for the *same* contested position whose
 * team isn't in this group. That matters because scoring continues after
 * a tiebreak - the set of teams tied for a position can change, and a
 * leftover rank from a previous group would quietly mis-order the new
 * one. Results for the other position are left untouched, so resolving a
 * 2nd-to-last tie never disturbs an already-settled podium.
 */
export async function applyTiebreakResult(
  quizId: string,
  position: ContestedPosition,
  orderedTeamIds: string[]
): Promise<void> {
  const existing = await getDocs(resultsCollection(quizId));
  const batch = writeBatch(db);

  for (const docSnapshot of existing.docs) {
    const result = docSnapshot.data() as TiebreakResult;
    if (result.position === position && !orderedTeamIds.includes(docSnapshot.id)) {
      batch.delete(docSnapshot.ref);
    }
  }

  orderedTeamIds.forEach((teamId, index) => {
    batch.set(doc(resultsCollection(quizId), teamId), {
      rank: index,
      position,
      resolvedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

/**
 * Finds teams a tiebreak has failed to separate: groups of two or more
 * whose guesses are *exactly* as close to the answer as each other.
 *
 * Covers both ways it happens: identical guesses, and guesses either
 * side of the answer at equal distance (488 and 512 against 500).
 * Neither has won, so neither gets a placing - the caller runs another
 * question between just them.
 *
 * Groups come back best-placed first. Teams without a guess are skipped;
 * confirming requires everyone to have one anyway.
 */
export function detectDeadHeats(
  correctAnswer: number,
  guesses: Record<string, number>,
  rankedTeamIds: string[]
): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];

  for (const teamId of rankedTeamIds) {
    const guess = guesses[teamId];
    if (guess === undefined) continue;

    const previous = current[current.length - 1];
    const isLevel =
      previous !== undefined &&
      Math.abs(guess - correctAnswer) === Math.abs(guesses[previous] - correctAnswer);

    if (isLevel) {
      current.push(teamId);
    } else {
      if (current.length > 1) groups.push(current);
      current = [teamId];
    }
  }
  if (current.length > 1) groups.push(current);

  return groups;
}

/**
 * Slots the result of a follow-up tiebreak back into the order already
 * established, by refilling exactly the positions the level teams were
 * occupying. Everyone else stays exactly where they were - a re-run
 * between two teams must never reshuffle the ones already separated.
 */
export function spliceResolvedOrder(
  pendingOrder: string[],
  contestedTeamIds: string[],
  resolvedOrder: string[]
): string[] {
  const queue = [...resolvedOrder];
  return pendingOrder.map((teamId) =>
    contestedTeamIds.includes(teamId) ? (queue.shift() ?? teamId) : teamId
  );
}

/**
 * Ranks tied teams by how close their guess was to the correct answer,
 * closest first. Teams that never had a guess entered sort to the back -
 * they can't win a tiebreak they didn't answer, and dropping them
 * entirely would leave them unranked and therefore still "pending".
 */
export function rankTeamsByGuess(
  correctAnswer: number,
  guesses: Record<string, number>,
  teamIds: string[]
): string[] {
  return [...teamIds].sort((a, b) => {
    const guessA = guesses[a];
    const guessB = guesses[b];
    if (guessA === undefined && guessB === undefined) return 0;
    if (guessA === undefined) return 1;
    if (guessB === undefined) return -1;
    return Math.abs(guessA - correctAnswer) - Math.abs(guessB - correctAnswer);
  });
}
