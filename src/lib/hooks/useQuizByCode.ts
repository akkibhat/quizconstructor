"use client";

import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { Quiz } from "@/lib/types/quiz";

/**
 * Resolves a short quiz code (e.g. "BRXK") to its quiz document and keeps
 * it live. This is what every code-gated route (Team Setup, Controller,
 * Scoring, Display, Leaderboard) uses to go from "code in the URL" to
 * "quiz data" - see useQuiz.ts for the admin-side equivalent that looks up
 * by Firestore document ID instead.
 *
 * The code -> quizId mapping in quizCodes is immutable once created (see
 * firestore.rules), so that half only needs a one-time lookup; the quiz
 * document itself is subscribed to normally so quiz-level changes (like
 * `status` flipping to "live") show up without a refresh.
 *
 * undefined = still resolving, null = code doesn't match any quiz.
 */
export function useQuizByCode(code: string | undefined): Quiz | null | undefined {
  const [quiz, setQuiz] = useState<Quiz | null | undefined>(undefined);

  useEffect(() => {
    if (!code) {
      return;
    }

    let unsubscribeFromQuiz: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const codeDoc = await getDoc(doc(db, "quizCodes", code.toUpperCase()));
      if (cancelled) return;

      if (!codeDoc.exists()) {
        setQuiz(null);
        return;
      }

      const quizId = codeDoc.data().quizId as string;
      unsubscribeFromQuiz = onSnapshot(doc(db, "quizzes", quizId), (snapshot) => {
        if (!snapshot.exists()) {
          setQuiz(null);
          return;
        }
        setQuiz({ id: snapshot.id, ...(snapshot.data() as Omit<Quiz, "id">) });
      });
    })();

    return () => {
      cancelled = true;
      unsubscribeFromQuiz?.();
    };
  }, [code]);

  return quiz;
}
