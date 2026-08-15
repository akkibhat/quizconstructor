"use client";

import { useMemo } from "react";

import { useQuestions } from "@/lib/hooks/useQuestions";
import { useQuestionsByRound } from "@/lib/hooks/useQuestionsByRound";
import { useRounds } from "@/lib/hooks/useRounds";
import { buildSlideList } from "@/lib/slides/buildSlideList";
import type { Quiz } from "@/lib/types/quiz";
import type { Slide } from "@/lib/types/slide";

/**
 * Builds the full presenter slide list for a quiz: fetches its rounds,
 * every real round's questions, and (if enabled) the Long Game round's
 * clues, then hands them to buildSlideList. Controller and Display both
 * use this - it's what guarantees they always agree on what "slide index
 * 14" means, since they compute the identical list from the identical
 * underlying data rather than one side telling the other.
 */
export function useSlideList(quiz: Quiz | null | undefined): Slide[] | undefined {
  const rounds = useRounds(quiz?.id);
  const realRounds = useMemo(() => rounds?.filter((round) => !round.isLongGame) ?? [], [rounds]);
  const longGameRound = rounds?.find((round) => round.isLongGame);

  const realRoundIds = useMemo(() => realRounds.map((round) => round.id), [realRounds]);
  const questionsByRound = useQuestionsByRound(quiz?.id, realRoundIds);
  const longGameClues = useQuestions(quiz?.id, longGameRound?.id);

  return useMemo(() => {
    if (!quiz || !rounds || !questionsByRound) {
      return undefined;
    }
    // Long Game is enabled but its clues haven't loaded yet - wait, rather
    // than briefly building a slide list with no clue slides at all.
    if (quiz.longGameEnabled && longGameClues === undefined) {
      return undefined;
    }

    return buildSlideList(
      realRounds,
      questionsByRound,
      quiz.longGameEnabled,
      longGameClues ?? [],
      quiz.longGameFinalAnswer
    );
  }, [quiz, rounds, questionsByRound, longGameClues, realRounds]);
}
