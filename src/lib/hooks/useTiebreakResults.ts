"use client";

import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { TiebreakResult } from "@/lib/types/tiebreakResult";

/**
 * Realtime resolved tiebreak placings for a quiz, keyed by teamId.
 * undefined = still loading.
 */
export function useTiebreakResults(
  quizId: string | undefined
): Record<string, TiebreakResult> | undefined {
  const [results, setResults] = useState<Record<string, TiebreakResult> | undefined>(undefined);

  useEffect(() => {
    if (!quizId) {
      return;
    }

    return onSnapshot(collection(db, "quizzes", quizId, "tiebreakResults"), (snapshot) => {
      const byTeamId: Record<string, TiebreakResult> = {};
      for (const docSnapshot of snapshot.docs) {
        byTeamId[docSnapshot.id] = docSnapshot.data() as TiebreakResult;
      }
      setResults(byTeamId);
    });
  }, [quizId]);

  return results;
}
