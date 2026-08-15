"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";

/**
 * Realtime subscription to one team's electronic-scoring marks for one
 * round - questionId -> points awarded. undefined = still loading, {} =
 * loaded but nothing marked yet (also the default if this team has never
 * been scored electronically for this round at all - there's no
 * meaningful difference between "no doc" and "empty marks" here).
 */
export function useQuestionMarks(
  quizId: string | undefined,
  roundId: string | undefined,
  teamId: string | undefined
): Record<string, number> | undefined {
  const [marks, setMarks] = useState<Record<string, number> | undefined>(undefined);

  useEffect(() => {
    if (!quizId || !roundId || !teamId) {
      return;
    }

    return onSnapshot(
      doc(db, "quizzes", quizId, "scores", roundId, "questionMarks", teamId),
      (snapshot) => {
        setMarks(snapshot.exists() ? ((snapshot.data().marks as Record<string, number>) ?? {}) : {});
      }
    );
  }, [quizId, roundId, teamId]);

  return marks;
}
