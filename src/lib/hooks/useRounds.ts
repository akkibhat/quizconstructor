"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { Round } from "@/lib/types/round";

/** Realtime, order-sorted list of a quiz's rounds. undefined = still loading. */
export function useRounds(quizId: string | undefined): Round[] | undefined {
  const [rounds, setRounds] = useState<Round[] | undefined>(undefined);

  useEffect(() => {
    if (!quizId) {
      return;
    }

    const roundsQuery = query(
      collection(db, "quizzes", quizId, "rounds"),
      orderBy("order", "asc")
    );

    return onSnapshot(roundsQuery, (snapshot) => {
      setRounds(
        snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<Round, "id">),
        }))
      );
    });
  }, [quizId]);

  return rounds;
}
