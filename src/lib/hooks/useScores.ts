"use client";

import { useCollectionMap } from "@/lib/hooks/useFirestore";
import type { RoundScores } from "@/lib/types/score";

/** Every round's scores, keyed by roundId. undefined = still loading. */
export function useScores(quizId: string | undefined): Record<string, RoundScores> | undefined {
  return useCollectionMap<RoundScores>(quizId ? ["quizzes", quizId, "scores"] : null);
}
