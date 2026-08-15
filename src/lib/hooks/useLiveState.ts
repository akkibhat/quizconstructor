"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { LiveState } from "@/lib/types/liveState";

/**
 * Realtime subscription to a quiz's live presenter state - the single
 * mechanism shared by Controller, Display, and Leaderboard (see
 * liveState/current in the data model). undefined = still loading, null =
 * the quiz hasn't been started yet (no liveState doc exists).
 */
export function useLiveState(quizId: string | undefined): LiveState | null | undefined {
  const [liveState, setLiveState] = useState<LiveState | null | undefined>(undefined);

  useEffect(() => {
    if (!quizId) {
      return;
    }

    return onSnapshot(doc(db, "quizzes", quizId, "liveState", "current"), (snapshot) => {
      setLiveState(snapshot.exists() ? (snapshot.data() as LiveState) : null);
    });
  }, [quizId]);

  return liveState;
}
