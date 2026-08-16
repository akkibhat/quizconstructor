"use client";

import { useCollectionMap } from "@/lib/hooks/useFirestore";
import type { LongGameResult } from "@/lib/types/longGame";

/** Long Game results keyed by teamId. undefined = still loading. */
export function useLongGameResults(
  quizId: string | undefined
): Record<string, LongGameResult> | undefined {
  return useCollectionMap<LongGameResult>(quizId ? ["quizzes", quizId, "longGame"] : null);
}
