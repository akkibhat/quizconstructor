"use client";

import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { BankQuestion } from "@/lib/types/bankQuestion";

/**
 * The host's whole question bank, realtime, grouped alphabetically by
 * category. undefined = still loading.
 *
 * Loads everything in one subscription and lets callers filter by
 * category in memory - at the scale this realistically reaches (a few
 * hundred questions built up over a year or two) that's one small read
 * instead of a new query every time the category dropdown changes, and
 * it makes "how many questions are in each pool" free to compute.
 *
 * Sorted here rather than in the query on purpose: ordering by category
 * *and* creation time server-side would need a composite Firestore
 * index, which is a lot of ceremony for a collection this size.
 */
export function useBankQuestions(): BankQuestion[] | undefined {
  const [questions, setQuestions] = useState<BankQuestion[] | undefined>(undefined);

  useEffect(() => {
    return onSnapshot(collection(db, "questionBank"), (snapshot) => {
      const all = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as BankQuestion[];

      all.sort((a, b) => {
        const byCategory = a.category.localeCompare(b.category);
        if (byCategory !== 0) return byCategory;
        return (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0);
      });

      setQuestions(all);
    });
  }, []);

  return questions;
}
