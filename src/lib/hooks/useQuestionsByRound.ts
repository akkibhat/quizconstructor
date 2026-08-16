"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import { normaliseQuestion, type Question } from "@/lib/types/question";

/**
 * Several rounds' questions at once, keyed by roundId.
 *
 * Separate from useQuestions because that one covers a single round (what
 * the round editor needs) and hooks can't be called in a loop to cover
 * many. Stays undefined until every round has reported, so callers never
 * see a half-filled map and build a slide list missing whole rounds.
 */
export function useQuestionsByRound(
  quizId: string | undefined,
  roundIds: string[]
): Record<string, Question[]> | undefined {
  const [questionsByRound, setQuestionsByRound] = useState<Record<string, Question[]> | undefined>(
    undefined
  );

  // Joined so the effect re-runs on a genuine change of rounds rather
  // than on every render, since roundIds is a fresh array each time.
  const roundIdsKey = roundIds.join(",");

  useEffect(() => {
    if (!quizId || !roundIdsKey) return;

    const ids = roundIdsKey.split(",");
    const collected: Record<string, Question[]> = {};
    const reported = new Set<string>();

    const unsubscribes = ids.map((roundId) =>
      onSnapshot(
        query(
          collection(db, "quizzes", quizId, "rounds", roundId, "questions"),
          orderBy("order", "asc")
        ),
        (snapshot) => {
          collected[roundId] = snapshot.docs.map((d) => normaliseQuestion(d.id, d.data()));
          reported.add(roundId);
          if (reported.size === ids.length) {
            setQuestionsByRound({ ...collected });
          }
        }
      )
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [quizId, roundIdsKey]);

  return questionsByRound;
}
