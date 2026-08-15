"use client";

import { useMemo } from "react";

import { useLongGameResults } from "@/lib/hooks/useLongGameResults";
import { useScores } from "@/lib/hooks/useScores";
import { useTeams } from "@/lib/hooks/useTeams";

export interface LeaderboardEntry {
  teamId: string;
  name: string;
  total: number;
}

/**
 * Combines teams, every round's scores, and Long Game results into a
 * ranked running total per team, sorted highest first.
 *
 * Computed client-side on every read rather than as a maintained
 * aggregate field: at this scale (a handful of teams, a dozen rounds)
 * summing a few small documents in the browser is instant, and it avoids
 * a second source of truth that could drift from the actual scores - see
 * the plan doc's Scoring Computation section for the full reasoning.
 */
export function useLeaderboardTotals(quizId: string | undefined): LeaderboardEntry[] | undefined {
  const teams = useTeams(quizId);
  const scores = useScores(quizId);
  const longGameResults = useLongGameResults(quizId);

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
        return { teamId: team.id, name: team.name, total: roundTotal + longGamePoints };
      })
      .sort((a, b) => b.total - a.total);
  }, [teams, scores, longGameResults]);
}
