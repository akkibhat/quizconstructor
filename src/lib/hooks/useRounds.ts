"use client";

import { orderBy } from "firebase/firestore";

import { useCollectionList } from "@/lib/hooks/useFirestore";
import { normaliseRound, type Round } from "@/lib/types/round";

/** A quiz's rounds, sorted by `order`. undefined = still loading. */
export function useRounds(quizId: string | undefined): Round[] | undefined {
  return useCollectionList<Round>(quizId ? ["quizzes", quizId, "rounds"] : null, {
    constraints: [orderBy("order", "asc")],
    normalise: normaliseRound,
  });
}
