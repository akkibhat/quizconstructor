"use client";

import { orderBy } from "firebase/firestore";

import { useCollectionList } from "@/lib/hooks/useFirestore";
import { normaliseQuestion, type Question } from "@/lib/types/question";

/**
 * A round's questions, sorted by `order`. undefined = still loading.
 * Also serves a Long Game round's clues, which are stored as its
 * questions - see Round.isLongGame.
 */
export function useQuestions(
  quizId: string | undefined,
  roundId: string | undefined
): Question[] | undefined {
  return useCollectionList<Question>(
    quizId && roundId ? ["quizzes", quizId, "rounds", roundId, "questions"] : null,
    { constraints: [orderBy("order", "asc")], normalise: normaliseQuestion }
  );
}
