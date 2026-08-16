"use client";

import { orderBy } from "firebase/firestore";

import { useCollectionList } from "@/lib/hooks/useFirestore";
import type { Team } from "@/lib/types/team";

/** A quiz's teams in signup order. undefined = still loading. */
export function useTeams(quizId: string | undefined): Team[] | undefined {
  return useCollectionList<Team>(quizId ? ["quizzes", quizId, "teams"] : null, {
    constraints: [orderBy("createdAt", "asc")],
  });
}
