"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase/client";

interface AuthState {
  // undefined = we haven't heard back from Firebase yet (still loading).
  // null = Firebase confirmed nobody is signed in.
  user: User | null | undefined;
}

/**
 * Tracks the current signed-in host across the whole app. There's only
 * ever one real user of this app (the quiz host), so this hook doesn't try
 * to model roles/permissions - it just answers "is anyone signed in, and
 * who".
 *
 * Note this is a UX convenience, not the actual security boundary - the
 * real access control is enforced by Firestore/Storage security rules,
 * which check request.auth regardless of what this hook reports.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
  }, []);

  return { user };
}
