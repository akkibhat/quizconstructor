"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { Question } from "@/lib/types/question";

/**
 * Subscribes to several rounds' questions at once, keyed by roundId.
 * Exists because useQuestions.ts is for one round at a time (what the
 * round editor page needs); the presenter's slide list needs every real
 * round's questions simultaneously, and React hooks can't be called in a
 * loop to get there.
 *
 * undefined until every round has reported at least one snapshot, so
 * consumers never see a partially-populated map.
 */
export function useQuestionsByRound(
  quizId: string | undefined,
  roundIds: string[]
): Record<string, Question[]> | undefined {
  const [questionsByRound, setQuestionsByRound] = useState<Record<string, Question[]> | undefined>(
    undefined
  );

  // Joined into a stable string so the effect only re-runs when the actual
  // set of round IDs changes, not on every render (roundIds is a fresh
  // array reference each time otherwise).
  const roundIdsKey = roundIds.join(",");

  useEffect(() => {
    if (!quizId || roundIds.length === 0) {
      return;
    }

    const result: Record<string, Question[]> = {};
    const reported = new Set<string>();

    const unsubscribes = roundIds.map((roundId) =>
      onSnapshot(
        query(
          collection(db, "quizzes", quizId, "rounds", roundId, "questions"),
          orderBy("order", "asc")
        ),
        (snapshot) => {
          result[roundId] = snapshot.docs.map((docSnapshot) => ({
            id: docSnapshot.id,
            ...(docSnapshot.data() as Omit<Question, "id">),
          }));
          reported.add(roundId);
          if (reported.size === roundIds.length) {
            setQuestionsByRound({ ...result });
          }
        }
      )
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roundIdsKey stands in for roundIds
  }, [quizId, roundIdsKey]);

  return questionsByRound;
}
