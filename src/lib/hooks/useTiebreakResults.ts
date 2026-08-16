"use client";

import { useCollectionMap } from "@/lib/hooks/useFirestore";
import type { TiebreakResult } from "@/lib/types/tiebreakResult";

/** Settled tiebreak placings keyed by teamId. undefined = still loading. */
export function useTiebreakResults(
  quizId: string | undefined
): Record<string, TiebreakResult> | undefined {
  return useCollectionMap<TiebreakResult>(quizId ? ["quizzes", quizId, "tiebreakResults"] : null);
}
