"use client";

import { useCollectionMap } from "@/lib/hooks/useFirestore";
import type { TeamAnswer } from "@/lib/types/teamAnswer";

/**
 * One team's phone-submitted answers, keyed by questionId - mirrors
 * useQuestionMarks' shape, since ElectronicScoringPanel shows both side by
 * side for the same selected team. undefined = still loading (or nothing
 * to load yet, if teamId isn't chosen).
 */
export function useTeamAnswers(
  quizId: string | undefined,
  teamId: string | undefined
): Record<string, TeamAnswer> | undefined {
  return useCollectionMap<TeamAnswer>(
    quizId && teamId ? ["quizzes", quizId, "teams", teamId, "answers"] : null
  );
}
