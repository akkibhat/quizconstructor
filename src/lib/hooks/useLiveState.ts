"use client";

import { useDocumentData } from "@/lib/hooks/useFirestore";
import type { LiveState } from "@/lib/types/liveState";

/**
 * A quiz's live presenter state - the one doc Controller, Display and
 * Leaderboard all subscribe to, so they never disagree about what's on
 * screen. undefined = loading, null = the quiz hasn't been started.
 */
export function useLiveState(quizId: string | undefined): LiveState | null | undefined {
  return useDocumentData<LiveState>(
    quizId ? ["quizzes", quizId, "liveState", "current"] : null,
    (data) => data as LiveState
  );
}
