"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { Round } from "@/lib/types/round";

/**
 * Fills in fields that rounds created before a given feature existed
 * won't have. Doing it here, at the single point every round enters the
 * app, means the rest of the code can treat a Round as complete rather
 * than guarding each field at every use site.
 *
 * This matters more than it looks: Firestore rejects a write containing
 * `undefined` outright, so a missing field read from an old document and
 * written straight back would fail the whole save with a confusing error.
 */
function normaliseRound(id: string, data: Record<string, unknown>): Round {
  const round = data as Omit<Round, "id">;
  return {
    id,
    ...round,
    roundType: round.roundType ?? "standard",
    listPrompt: round.listPrompt ?? null,
    listAnswerReference: round.listAnswerReference ?? null,
    flavour: round.flavour ?? "standard",
    themeNote: round.themeNote ?? null,
    answerPool: round.answerPool ?? null,
  };
}

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
      setRounds(snapshot.docs.map((docSnapshot) => normaliseRound(docSnapshot.id, docSnapshot.data())));
    });
  }, [quizId]);

  return rounds;
}
