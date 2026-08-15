"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { Team } from "@/lib/types/team";

/** Realtime list of a quiz's teams, in signup order. undefined = still loading. */
export function useTeams(quizId: string | undefined): Team[] | undefined {
  const [teams, setTeams] = useState<Team[] | undefined>(undefined);

  useEffect(() => {
    if (!quizId) {
      return;
    }

    const teamsQuery = query(
      collection(db, "quizzes", quizId, "teams"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(teamsQuery, (snapshot) => {
      setTeams(
        snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<Team, "id">),
        }))
      );
    });
  }, [quizId]);

  return teams;
}
