import type { Timestamp } from "firebase/firestore";

// One team's result for a single round.
export interface ScoreEntry {
  // Points the host actually entered for this team on this round, before
  // any multiplier.
  raw: number;
  // Whether this team had picked this round as one of their double-points
  // rounds. Recorded at scoring time so the history of "was this doubled"
  // doesn't silently change if the team's picks were ever edited later.
  isDoubled: boolean;
  // raw * 2 if isDoubled, otherwise just raw. Stored (not recomputed on
  // every read) so the leaderboard can sum these directly.
  points: number;
}

// Firestore document at quizzes/{quizId}/scores/{roundId} - doc ID is the
// roundId it scores. Holds every team's result for that round in one doc,
// keyed by teamId, rather than one doc per team per round - keeps the
// per-round scoring UI a single read/write instead of N of them.
export interface RoundScores {
  entries: Record<string, ScoreEntry>;
  updatedAt: Timestamp;
}
