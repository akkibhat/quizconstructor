"use client";

import { orderBy } from "firebase/firestore";

import { useCollectionList } from "@/lib/hooks/useFirestore";
import type { TiebreakQuestion } from "@/lib/types/tiebreakQuestion";

/** The global tiebreak bank, newest first - shared across every quiz, not scoped to one. */
export function useTiebreakQuestions(): TiebreakQuestion[] | undefined {
  return useCollectionList<TiebreakQuestion>(["tiebreakQuestions"], {
    constraints: [orderBy("createdAt", "desc")],
  });
}
