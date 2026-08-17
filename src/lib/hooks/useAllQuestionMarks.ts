"use client";

import { useCollectionList } from "@/lib/hooks/useFirestore";

/** One team's electronic marks, with the team's id folded in so callers can match it back up. */
export interface TeamQuestionMarks {
  id: string; // teamId
  marks: Record<string, number>;
}

/**
 * Every team's electronic-scoring marks for one round, in a single
 * subscription - questionMarks/{teamId} is already a flat collection
 * (one doc per team, all under the same round), so unlike a team's
 * answers (nested per-team, see useAnswersForQuestion) this needs no
 * bespoke fan-out. Powers the "X/Y correct" stat in ElectronicScoringPanel.
 */
export function useAllQuestionMarks(
  quizId: string | undefined,
  roundId: string | undefined
): TeamQuestionMarks[] | undefined {
  return useCollectionList<TeamQuestionMarks>(
    quizId && roundId ? ["quizzes", quizId, "scores", roundId, "questionMarks"] : null,
    { normalise: (id, data) => ({ id, marks: (data.marks as Record<string, number>) ?? {} }) }
  );
}
