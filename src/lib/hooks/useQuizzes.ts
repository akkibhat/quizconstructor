"use client";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { Quiz } from "@/lib/types/quiz";

/**
 * Realtime list of a host's own quizzes for the "my quizzes" admin page.
 * Archived quizzes are filtered out - see Quiz.archived for why archiving
 * (not deleting) is how quizzes get removed from this list.
 *
 * Returns undefined while the first snapshot hasn't arrived yet, so the UI
 * can distinguish "still loading" from "genuinely has zero quizzes".
 */
export function useQuizzes(hostUid: string | undefined): Quiz[] | undefined {
  const [quizzes, setQuizzes] = useState<Quiz[] | undefined>(undefined);

  useEffect(() => {
    // No signed-in host yet - nothing to subscribe to. Initial state is
    // already `undefined`, so there's nothing to reset here.
    if (!hostUid) {
      return;
    }

    const quizzesQuery = query(
      collection(db, "quizzes"),
      where("hostUid", "==", hostUid),
      where("archived", "==", false),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(quizzesQuery, (snapshot) => {
      setQuizzes(
        snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<Quiz, "id">),
        }))
      );
    });
  }, [hostUid]);

  return quizzes;
}
