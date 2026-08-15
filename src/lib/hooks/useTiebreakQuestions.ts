"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { TiebreakQuestion } from "@/lib/types/tiebreakQuestion";

/**
 * Realtime subscription to the global tiebreak question bank - shared
 * across every quiz, not scoped to one. undefined = still loading.
 */
export function useTiebreakQuestions(): TiebreakQuestion[] | undefined {
  const [questions, setQuestions] = useState<TiebreakQuestion[] | undefined>(undefined);

  useEffect(() => {
    const tiebreakQuery = query(collection(db, "tiebreakQuestions"), orderBy("createdAt", "desc"));
    return onSnapshot(tiebreakQuery, (snapshot) => {
      setQuestions(
        snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<TiebreakQuestion, "id">),
        }))
      );
    });
  }, []);

  return questions;
}
