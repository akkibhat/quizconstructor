import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";

import { auth } from "@/lib/firebase/client";

/**
 * Signs the current device in anonymously if it isn't already, and
 * returns the resulting uid. This is the ONLY identity a self-registered
 * team has - see Team.ownerUid - so it's what firestore.rules checks to
 * let a team write its own doc and submit its own answers. Persists
 * across reloads via Firebase's own local storage, which is what makes
 * "one phone per team" survive the page refreshing mid-quiz.
 *
 * Safe to call even if a session already exists - signInAnonymously()
 * only creates a new anonymous user when there's no current one.
 */
export async function ensureAnonymousTeamAuth(): Promise<string> {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}

/**
 * The current device's anon-auth uid, kept live - used by /answer/[code]
 * to find which team (if any) this device already owns, without forcing
 * a fresh sign-in on every render. undefined while Firebase is still
 * resolving the persisted session; null once resolved with nobody signed in.
 */
export function subscribeToTeamAuthUid(callback: (uid: string | null) => void): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    callback(user?.uid ?? null);
  });
}
