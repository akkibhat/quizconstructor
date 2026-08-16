import type { Timestamp } from "firebase/firestore";

import type { ContestedPosition } from "./liveState";

/**
 * Firestore document at quizzes/{quizId}/tiebreakResults/{teamId} - the
 * durable outcome of a tiebreak, as opposed to the in-progress
 * TiebreakState that lives on the liveState doc.
 *
 * A separate collection rather than a field on the team because team
 * documents are only writable while status is "setup", and tiebreaks
 * happen once the quiz is live. Mirrors longGame/{teamId}.
 *
 * Without it the leaderboard could never badge the right team: tied teams
 * share a total, so their order would be whatever the sort produced.
 */
export interface TiebreakResult {
  // Place within the tied group, 0 = winner. What it *does* depends on
  // the position, because the two ties ask different questions:
  //
  // - "top": order is the point, so this feeds the leaderboard sort and
  //   turns a tied lead into a real 1st/2nd/3rd.
  // - "second-to-last": only the prize is at stake, so rank 0 means "won
  //   it" and the row order is left alone.
  //
  // Placing only, either way - it never touches a total, so winning a
  // tiebreak is worth no points.
  rank: number;

  // Which contested position this result came from. Kept so re-running a
  // tiebreak for one position can clear only its own stale results and
  // leave the other position's alone - and so the leaderboard knows
  // whether this rank should affect sorting or just the prize badge.
  position: ContestedPosition;

  resolvedAt: Timestamp;
}
