import { doc, getDoc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { ensureAnonymousTeamAuth } from "@/lib/teamAuth";

export class InvalidRecoveryCodeError extends Error {}

/**
 * Lets a NEW device claim an EXISTING team - the fix for "phone died mid-
 * quiz" or "switched devices". Signs this device in anonymously (a fresh
 * uid, since it's never been seen before), looks up the code in
 * teamRecoveryCodes (see registerTeamSelfService, which mints one at
 * signup), then updates the team's ownerUid to this device.
 *
 * The actual security boundary is NOT this lookup - a client claiming to
 * have found a valid code proves nothing on its own. It's the
 * firestore.rules update rule for teams/{teamId}, which independently
 * re-derives the same teamRecoveryCodes lookup server-side via its own
 * get() before allowing the ownerUid change. This function existing is
 * just what makes the write worth attempting; the rule is what makes it
 * safe. See the rules file's own comment on this branch for the full
 * reasoning.
 *
 * Throws InvalidRecoveryCodeError if the code doesn't exist - callers
 * should catch this specifically to show "that code isn't right" rather
 * than a generic error.
 */
export async function reclaimTeam(
  recoveryCode: string
): Promise<{ quizId: string; teamId: string }> {
  const codeSnap = await getDoc(doc(db, "teamRecoveryCodes", recoveryCode.trim().toUpperCase()));
  if (!codeSnap.exists()) {
    throw new InvalidRecoveryCodeError("That recovery code doesn't match any team.");
  }
  const { quizId, teamId } = codeSnap.data() as { quizId: string; teamId: string };

  const ownerUid = await ensureAnonymousTeamAuth();
  await updateDoc(doc(db, "quizzes", quizId, "teams", teamId), {
    ownerUid,
    lastClaimedViaCode: recoveryCode.trim().toUpperCase(),
  });

  return { quizId, teamId };
}
