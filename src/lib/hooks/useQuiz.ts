"use client";

import { useDocumentData } from "@/lib/hooks/useFirestore";
import type { Quiz } from "@/lib/types/quiz";

/**
 * One quiz by its Firestore document ID, for the admin pages that
 * navigate by id rather than the short code (useQuizByCode covers that).
 * undefined = loading, null = no such quiz.
 */
export function useQuiz(quizId: string | undefined): Quiz | null | undefined {
  return useDocumentData<Quiz>(quizId ? ["quizzes", quizId] : null);
}
