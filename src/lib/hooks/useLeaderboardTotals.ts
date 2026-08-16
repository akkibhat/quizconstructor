"use client";

import { useMemo } from "react";

import { useLongGameResults } from "@/lib/hooks/useLongGameResults";
import { useScores } from "@/lib/hooks/useScores";
import { useTeams } from "@/lib/hooks/useTeams";
import { useTiebreakResults } from "@/lib/hooks/useTiebreakResults";
import type { ContestedPosition } from "@/lib/types/liveState";

export interface LeaderboardEntry {
  teamId: string;
  name: string;
  total: number;
  // The outcome of a tiebreak this team was in, or null if it hasn't
  // been in one. Its presence is what tells the leaderboard a contested
  // position has actually been settled; what the rank then *means*
  // depends on the position - see TiebreakResult.
  tiebreak: { position: ContestedPosition; rank: number } | null;
}

/**
 * Combines teams, every round's scores, Long Game results and any
 * resolved tiebreak placings into a ranked running total per team,
 * sorted highest first.
 *
 * Summed in the browser on every read rather than kept as an aggregate
 * field - instant at this scale, and it avoids a second source of truth
 * that could drift from the actual scores.
 *
 * Sorted by total, then by the placing from a settled tie for the lead:
 * without that second key, teams on equal totals sit in whatever order
 * the sort left them, making "1st place" arbitrary. A settled tie at the
 * bottom doesn't reorder anything - only the prize badge is at stake
 * there, and LeaderboardView puts that on the winner directly.
 */
export function useLeaderboardTotals(quizId: string | undefined): LeaderboardEntry[] | undefined {
  const teams = useTeams(quizId);
  const scores = useScores(quizId);
  const longGameResults = useLongGameResults(quizId);
  const tiebreakResults = useTiebreakResults(quizId);

  return useMemo(() => {
    if (!teams || !scores) {
      return undefined;
    }

    return teams
      .map((team) => {
        const roundTotal = Object.values(scores).reduce(
          (sum, roundScores) => sum + (roundScores.entries[team.id]?.points ?? 0),
          0
        );
        const longGamePoints = longGameResults?.[team.id]?.pointsAwarded ?? 0;
        const result = tiebreakResults?.[team.id];
        return {
          teamId: team.id,
          name: team.name,
          total: roundTotal + longGamePoints,
          tiebreak: result ? { position: result.position, rank: result.rank } : null,
        };
      })
      .sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }
        // Only a settled tie for the lead reorders the board. Anything
        // else sorts as 0, which leaves those rows exactly where they
        // already were rather than shuffling teams on equal scores.
        const rankOf = (entry: { tiebreak: { position: ContestedPosition; rank: number } | null }) =>
          entry.tiebreak?.position === "top" ? entry.tiebreak.rank : 0;
        return rankOf(a) - rankOf(b);
      });
  }, [teams, scores, longGameResults, tiebreakResults]);
}
