"use client";

import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { LongGameResult } from "@/lib/types/longGame";

/**
 * Realtime Long Game results for every team in a quiz, keyed by teamId.
 * undefined = still loading.
 */
export function useLongGameResults(
  quizId: string | undefined
): Record<string, LongGameResult> | undefined {
  const [results, setResults] = useState<Record<string, LongGameResult> | undefined>(undefined);

  useEffect(() => {
    if (!quizId) {
      return;
    }

    return onSnapshot(collection(db, "quizzes", quizId, "longGame"), (snapshot) => {
      const byTeamId: Record<string, LongGameResult> = {};
      for (const docSnapshot of snapshot.docs) {
        byTeamId[docSnapshot.id] = docSnapshot.data() as LongGameResult;
      }
      setResults(byTeamId);
    });
  }, [quizId]);

  return results;
}
