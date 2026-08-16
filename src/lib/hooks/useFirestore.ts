"use client";

import {
  collection,
  doc,
  onSnapshot,
  query,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase/client";

/**
 * The plumbing every Firestore hook in this folder used to repeat: hold
 * state, subscribe on mount, map the snapshot, unsubscribe on the way
 * out. Keeping it here leaves each hook saying only what it reads and
 * what shape it hands back.
 *
 * Passing `null` for the path means "nothing to subscribe to yet" - a
 * route param still resolving, or a signed-out user. The hook stays
 * `undefined`, which every caller already reads as "still loading".
 */

/** Turns ["quizzes", id, "teams"] into a collection reference. */
function collectionAt(segments: string[]) {
  return collection(db, segments[0], ...segments.slice(1));
}

/** Turns ["quizzes", id] into a document reference. */
function documentAt(segments: string[]) {
  return doc(db, segments[0], ...segments.slice(1));
}

/**
 * Live array of documents, each with its `id` folded in.
 *
 * `normalise` is for collections whose older documents predate a field -
 * see normaliseRound, which fills those in here so nothing downstream has
 * to guard for them.
 *
 * `deps` is only needed when something *outside* the path changes the
 * query, such as the uid inside a `where` clause.
 */
export function useCollectionList<T>(
  path: readonly string[] | null,
  options: {
    constraints?: QueryConstraint[];
    deps?: readonly unknown[];
    normalise?: (id: string, data: DocumentData) => T;
  } = {}
): T[] | undefined {
  const { constraints, deps, normalise } = options;
  const [items, setItems] = useState<T[] | undefined>(undefined);

  const pathKey = path?.join("/") ?? null;
  const depsKey = JSON.stringify(deps ?? []);

  useEffect(() => {
    if (!pathKey) return;

    return onSnapshot(
      query(collectionAt(pathKey.split("/")), ...(constraints ?? [])),
      (snapshot) => {
        setItems(
          snapshot.docs.map((docSnapshot) =>
            normalise
              ? normalise(docSnapshot.id, docSnapshot.data())
              : ({ id: docSnapshot.id, ...docSnapshot.data() } as T)
          )
        );
      }
    );
    // `constraints` and `normalise` come from this render's closure, which
    // is always the current one whenever the effect actually re-runs.
    // Listing them would restart the subscription on every render, since
    // callers build them inline - so the path and `deps` key it instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey, depsKey]);

  return items;
}

/**
 * Live collection keyed by document id, for the collections where the id
 * *is* the lookup - scores by roundId, results by teamId. The id isn't
 * folded into the value, since the key already carries it.
 */
export function useCollectionMap<T>(
  path: readonly string[] | null
): Record<string, T> | undefined {
  const [items, setItems] = useState<Record<string, T> | undefined>(undefined);
  const pathKey = path?.join("/") ?? null;

  useEffect(() => {
    if (!pathKey) return;

    return onSnapshot(collectionAt(pathKey.split("/")), (snapshot) => {
      const byId: Record<string, T> = {};
      for (const docSnapshot of snapshot.docs) {
        byId[docSnapshot.id] = docSnapshot.data() as T;
      }
      setItems(byId);
    });
  }, [pathKey]);

  return items;
}

/**
 * Live single document. `undefined` while loading, `null` when it doesn't
 * exist - a distinction callers rely on to tell "still fetching" from
 * "genuinely isn't there".
 *
 * `read` shapes the data; without it the document is returned with its id
 * folded in.
 */
export function useDocumentData<T>(
  path: readonly string[] | null,
  read?: (data: DocumentData, id: string) => T
): T | null | undefined {
  const [value, setValue] = useState<T | null | undefined>(undefined);
  const pathKey = path?.join("/") ?? null;

  useEffect(() => {
    if (!pathKey) return;

    return onSnapshot(documentAt(pathKey.split("/")), (snapshot) => {
      if (!snapshot.exists()) {
        setValue(null);
        return;
      }
      const data = snapshot.data();
      setValue(read ? read(data, snapshot.id) : ({ id: snapshot.id, ...data } as T));
    });
    // `read` comes from this render's closure - see the note in
    // useCollectionList for why it isn't a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey]);

  return value;
}
