"use client";

import { useDocumentData } from "@/lib/hooks/useFirestore";

/**
 * One team's electronic-scoring marks for one round: questionId -> points.
 *
 * A missing document reads as `{}` rather than null - a team that has
 * never been marked and one marked then cleared are the same thing here.
 * undefined still means "still loading".
 */
export function useQuestionMarks(
  quizId: string | undefined,
  roundId: string | undefined,
  teamId: string | undefined
): Record<string, number> | undefined {
  const marks = useDocumentData<Record<string, number>>(
    quizId && roundId && teamId
      ? ["quizzes", quizId, "scores", roundId, "questionMarks", teamId]
      : null,
    (data) => (data.marks as Record<string, number>) ?? {}
  );

  return marks === null ? {} : marks;
}
