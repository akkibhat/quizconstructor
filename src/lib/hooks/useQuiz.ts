"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { Quiz } from "@/lib/types/quiz";

/**
 * Realtime subscription to a single quiz by its Firestore document ID -
 * used by the admin editor pages, which navigate by quizId rather than the
 * short code (that's what useQuizByCode is for, on the public routes).
 *
 * undefined = still loading, null = no such quiz.
 */
export function useQuiz(quizId: string | undefined): Quiz | null | undefined {
  const [quiz, setQuiz] = useState<Quiz | null | undefined>(undefined);

  useEffect(() => {
    // No id yet (e.g. still resolving route params) - nothing to
    // subscribe to. Initial state is already `undefined`, so there's
    // nothing to reset here.
    if (!quizId) {
      return;
    }

    return onSnapshot(doc(db, "quizzes", quizId), (snapshot) => {
      if (!snapshot.exists()) {
        setQuiz(null);
        return;
      }
      setQuiz({ id: snapshot.id, ...(snapshot.data() as Omit<Quiz, "id">) });
    });
  }, [quizId]);

  return quiz;
}
