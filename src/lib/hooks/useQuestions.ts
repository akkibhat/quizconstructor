"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { Question } from "@/lib/types/question";

/** Realtime, order-sorted list of a round's questions. undefined = still loading. */
export function useQuestions(
  quizId: string | undefined,
  roundId: string | undefined
): Question[] | undefined {
  const [questions, setQuestions] = useState<Question[] | undefined>(undefined);

  useEffect(() => {
    if (!quizId || !roundId) {
      return;
    }

    const questionsQuery = query(
      collection(db, "quizzes", quizId, "rounds", roundId, "questions"),
      orderBy("order", "asc")
    );

    return onSnapshot(questionsQuery, (snapshot) => {
      setQuestions(
        snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<Question, "id">),
        }))
      );
    });
  }, [quizId, roundId]);

  return questions;
}
