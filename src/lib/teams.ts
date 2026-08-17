import { collection, doc, deleteDoc, serverTimestamp, setDoc, writeBatch, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { generateRecoveryCode } from "@/lib/codeGen";
import { ensureAnonymousTeamAuth } from "@/lib/teamAuth";

/**
 * Adds a team with its double-points round picks already decided. Unlike
 * rounds/questions, a team can't be created "empty" and filled in later -
 * the security rules require doubleRoundPicks to already have exactly the
 * quiz's configured count (or be empty, if double points is disabled) on
 * every write, including creation. So the add-team form collects the name
 * and picks together in one step, matching "teams pick their rounds at
 * signup" from the plan.
 *
 * This is the host-typed path - ownerUid is always null here, since the
 * host (not a team's own phone) is the one creating the document. See
 * registerTeamSelfService for the /join/[code] equivalent.
 */
export async function addTeam(
  quizId: string,
  name: string,
  doubleRoundPicks: string[]
): Promise<void> {
  const teamRef = doc(collection(db, "quizzes", quizId, "teams"));
  await setDoc(teamRef, {
    name,
    doubleRoundPicks,
    ownerUid: null,
    createdAt: serverTimestamp(),
  });
}

/**
 * The /join/[code] path: a team registers itself from its own phone.
 * Signs the device in anonymously first (idempotent - reuses an existing
 * session), then creates a team owned by that device's uid.
 *
 * Takes doubleRoundPicks same as addTeam and for the same reason - the
 * security rules validate the count matches the quiz's configuration on
 * every team creation, self-service included, so /join's form has to
 * collect picks exactly like the host's AddTeamForm does when double
 * points is enabled.
 *
 * Also mints a recovery code (see lib/teamRecovery.ts) in the same batch,
 * so a lost/dead phone isn't a dead end - a different device can later
 * reclaim this exact team by providing it. Returned alongside the team id
 * so the UI can show it once, right after joining ("save this in case you
 * switch phones") - it's never shown again afterward, since the team doc
 * itself doesn't store it (see the security-model note in
 * firestore.rules for why it can't live there).
 *
 * Returns the new team's id and recovery code. useMyTeam re-derives the
 * team from ownerUid on future visits, so the id return is really just to
 * avoid a redundant round-trip immediately after creating it.
 */
export async function registerTeamSelfService(
  quizId: string,
  name: string,
  doubleRoundPicks: string[]
): Promise<{ teamId: string; recoveryCode: string }> {
  const ownerUid = await ensureAnonymousTeamAuth();
  const teamRef = doc(collection(db, "quizzes", quizId, "teams"));
  const recoveryCode = generateRecoveryCode();
  const recoveryCodeRef = doc(db, "teamRecoveryCodes", recoveryCode);

  const batch = writeBatch(db);
  batch.set(teamRef, {
    name,
    doubleRoundPicks,
    ownerUid,
    createdAt: serverTimestamp(),
  });
  batch.set(recoveryCodeRef, {
    quizId,
    teamId: teamRef.id,
    createdAt: serverTimestamp(),
  });
  await batch.commit();

  return { teamId: teamRef.id, recoveryCode };
}

export async function deleteTeam(quizId: string, teamId: string): Promise<void> {
  await deleteDoc(doc(db, "quizzes", quizId, "teams", teamId));
}

/**
 * Updates a team's double-points picks. Only succeeds while the quiz is
 * still in "setup" - the security rules reject this once the quiz goes
 * live, which is what "locked before the quiz starts" means mechanically.
 */
export async function updateTeamPicks(
  quizId: string,
  teamId: string,
  doubleRoundPicks: string[]
): Promise<void> {
  await updateDoc(doc(db, "quizzes", quizId, "teams", teamId), { doubleRoundPicks });
}
