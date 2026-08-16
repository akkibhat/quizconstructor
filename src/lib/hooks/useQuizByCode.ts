"use client";

import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import { useDocumentData } from "@/lib/hooks/useFirestore";
import type { Quiz } from "@/lib/types/quiz";

/**
 * Resolves a short quiz code ("BRXK") to its quiz, and keeps the quiz
 * live. Every code-gated route uses this; useQuiz is the admin-side
 * equivalent that looks up by document ID.
 *
 * The code -> quizId mapping is immutable once written (see
 * firestore.rules), so that half is a one-time fetch. Only the quiz
 * itself is subscribed to, so changes like `status` flipping to "live"
 * arrive without a refresh.
 *
 * undefined = still resolving, null = no quiz for that code.
 */
export function useQuizByCode(code: string | undefined): Quiz | null | undefined {
  const [quizId, setQuizId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    getDoc(doc(db, "quizCodes", code.toUpperCase())).then((codeDoc) => {
      if (cancelled) return;
      setQuizId(codeDoc.exists() ? (codeDoc.data().quizId as string) : null);
    });

    return () => {
      cancelled = true;
    };
  }, [code]);

  const quiz = useDocumentData<Quiz>(quizId ? ["quizzes", quizId] : null);

  // A code that matched nothing is a definite "no quiz", not a wait -
  // without this the route would sit on its loading state forever.
  return quizId === null ? null : quiz;
}
