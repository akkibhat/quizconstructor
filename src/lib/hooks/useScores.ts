"use client";

import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { RoundScores } from "@/lib/types/score";

/**
 * Realtime scores for every round of a quiz, keyed by roundId (each
 * round's doc ID in the `scores` collection). undefined = still loading.
 */
export function useScores(quizId: string | undefined): Record<string, RoundScores> | undefined {
  const [scores, setScores] = useState<Record<string, RoundScores> | undefined>(undefined);

  useEffect(() => {
    if (!quizId) {
      return;
    }

    return onSnapshot(collection(db, "quizzes", quizId, "scores"), (snapshot) => {
      const byRoundId: Record<string, RoundScores> = {};
      for (const docSnapshot of snapshot.docs) {
        byRoundId[docSnapshot.id] = docSnapshot.data() as RoundScores;
      }
      setScores(byRoundId);
    });
  }, [quizId]);

  return scores;
}
