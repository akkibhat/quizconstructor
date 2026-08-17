"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { TeamAnswer } from "@/lib/types/teamAnswer";

/**
 * Every team's submitted answer to ONE specific question, live. Unlike
 * everything in lib/hooks/useFirestore.ts, this can't be a single
 * subscription: a TeamAnswer lives at teams/{teamId}/answers/{questionId},
 * a different parent collection per team, so there's no one collection
 * path to query. Instead this opens one onSnapshot listener per team and
 * merges them into a single result - fine at pub-quiz team counts
 * (roughly 5-20), and avoids needing a Firestore collectionGroup query
 * (which would need a denormalised quizId on every TeamAnswer doc plus
 * its own security rules just for this one feature).
 *
 * Powers both the Controller's "X of Y answered" live count and the
 * optional Display answer-reveal tally - same shape, two consumers.
 *
 * Result is keyed by teamId; a team with no submitted answer for this
 * question simply has no entry (not `undefined` under its key - use
 * `key in result` or `Object.keys(result).length` to count answered).
 */
export function useAnswersForQuestion(
  quizId: string | undefined,
  teamIds: readonly string[],
  questionId: string | undefined
): Record<string, TeamAnswer> | undefined {
  const [answers, setAnswers] = useState<Record<string, TeamAnswer> | undefined>(undefined);
  const teamIdsKey = teamIds.join(",");

  useEffect(() => {
    if (!quizId || !questionId || teamIds.length === 0) {
      return;
    }

    // Each snapshot callback only ever touches its OWN team's slot, keyed
    // off a closed-over "generation" token rather than resetting `answers`
    // synchronously up front (which is what the codebase's own
    // useFirestore.ts primitives also avoid, and what trips
    // react-hooks/set-state-in-effect otherwise). A stale entry from the
    // previous question is overwritten or deleted by its OWN team's first
    // snapshot on the new question, same as every other team's - the
    // brief window where a just-changed question shows a couple of
    // leftover entries from the last one self-corrects within one round
    // trip per team, same staleness window useDocumentData already
    // accepts when its own path changes.
    const unsubscribes = teamIds.map((teamId) =>
      onSnapshot(doc(db, "quizzes", quizId, "teams", teamId, "answers", questionId), (snapshot) => {
        setAnswers((current) => {
          const next = { ...(current ?? {}) };
          if (snapshot.exists()) {
            next[teamId] = { ...(snapshot.data() as TeamAnswer), questionId };
          } else {
            delete next[teamId];
          }
          return next;
        });
      })
    );

    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
    // teamIdsKey (not teamIds itself) is the real dependency - the array
    // identity changes every render for callers building it inline (e.g.
    // teams.map(t => t.id)), which would tear down and rebuild all N
    // listeners every render otherwise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, questionId, teamIdsKey]);

  return answers;
}
