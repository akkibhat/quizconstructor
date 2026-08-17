"use client";

import { useMemo } from "react";

import { useCollectionList } from "@/lib/hooks/useFirestore";
import { normaliseBankQuestion, type BankQuestion } from "@/lib/types/bankQuestion";

/**
 * The host's whole question bank, grouped by category then by when each
 * question was added. undefined = still loading.
 *
 * Loads everything in one subscription and lets callers filter in memory.
 * At the scale this reaches - a few hundred questions built up over a
 * year or two - that's one small read instead of a fresh query every time
 * the category dropdown changes, and it makes each pool's count free to
 * compute. Sorting happens here rather than server-side because ordering
 * by category *and* creation time would need a composite index.
 */
export function useBankQuestions(): BankQuestion[] | undefined {
  const questions = useCollectionList<BankQuestion>(["questionBank"], {
    normalise: normaliseBankQuestion,
  });

  return useMemo(
    () =>
      questions
        ?.slice()
        .sort(
          (a, b) =>
            (a.categories[0] ?? "").localeCompare(b.categories[0] ?? "") ||
            (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)
        ),
    [questions]
  );
}
