import type { Timestamp } from "firebase/firestore";

// Firestore document at quizzes/{quizId}/teams/{teamId}.
export interface Team {
  id: string;
  name: string;

  // Round IDs this team has chosen as their own personal double-points
  // rounds. Must contain exactly quiz.doublePointsPicksPerTeam entries when
  // doublePointsEnabled is true, or be empty otherwise - enforced both in
  // the team-setup UI and in the Firestore security rules. Writable only
  // while quiz.status === "setup", so picks are locked once the quiz goes
  // live.
  doubleRoundPicks: string[];

  // The Firebase Auth uid of the phone/device that self-registered this
  // team, when Quiz.allowsPhoneAnswering is on - see lib/teamAuth.ts. null
  // for a team the host typed in themselves on /team-setup. This is the
  // ONLY thing that lets a device write to this team's own answers
  // subcollection - see firestore.rules. One phone per team by design:
  // whichever device created the team is the only one that can submit its
  // answers.
  ownerUid: string | null;

  // Set only when ownerUid has been changed via a recovery-code reclaim
  // (see lib/teamRecovery.ts) - the code that was used, kept as a light
  // audit trail for the host. Undefined on a team that's never been
  // reclaimed. Not itself a secret and not how reclaiming is authorized -
  // that's teamRecoveryCodes, a separate unguessable-lookup collection
  // (see firestore.rules) - this field is just a record of what happened.
  lastClaimedViaCode?: string;

  createdAt: Timestamp;
}
