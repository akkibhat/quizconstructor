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

  createdAt: Timestamp;
}
