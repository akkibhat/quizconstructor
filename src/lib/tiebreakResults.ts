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
