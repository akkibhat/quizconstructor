"use client";

import { orderBy, where } from "firebase/firestore";

import { useCollectionList } from "@/lib/hooks/useFirestore";
import type { Quiz } from "@/lib/types/quiz";

/**
 * A host's own quizzes, newest first. undefined = still loading, so the
 * dashboard can tell that apart from "genuinely has none yet".
 *
 * Archived quizzes are excluded - archiving, not deleting, is how a quiz
 * leaves this list (see Quiz.archived). `hostUid` is passed as a dep
 * because it sits inside a where clause rather than in the path.
 */
export function useQuizzes(hostUid: string | undefined): Quiz[] | undefined {
  return useCollectionList<Quiz>(hostUid ? ["quizzes"] : null, {
    constraints: [
      where("hostUid", "==", hostUid),
      where("archived", "==", false),
      orderBy("createdAt", "desc"),
    ],
    deps: [hostUid],
  });
}
