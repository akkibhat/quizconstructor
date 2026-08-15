import type { Timestamp } from "firebase/firestore";

import type { ContestedPosition } from "./liveState";

/**
 * Firestore document at quizzes/{quizId}/tiebreakResults/{teamId} - the
 * durable outcome of a tiebreak, as opposed to the in-progress
 * TiebreakState that lives on the liveState doc.
 *
 * Why a separate collection rather than a field on the team: team
 * documents are only writable while the quiz's status is "setup" (see
 * firestore.rules), and tiebreaks by definition happen once the quiz is
 * live. This mirrors how longGame/{teamId} works.
 *
 * Why store this at all: without it the leaderboard can never show a
 * correct winner or 2nd-to-last badge, because tied teams share a total
 * and their order would otherwise be whatever the sort happened to
 * produce.
 */
export interface TiebreakResult {
  // The team's place within its tied group, 0 = best / the winner.
  //
  // What that placing *does* depends on the position, because the two
  // ties are asking different questions:
  //
  // - "top": the podium is about order, so this is folded into the
  //   leaderboard sort as a secondary key after the total - a settled tie
  //   for the lead produces a real 1st/2nd/3rd instead of an arbitrary one.
  // - "second-to-last": only one thing is at stake, the prize. Rank 0
  //   means "won it", and the board's row order is deliberately left
  //   alone - shuffling teams who are all on the same score would be
  //   churn for no gain when the badge is the entire outcome.
  //
  // Either way this is placing only. It never touches a team's total, so
  // winning a tiebreak is worth no points.
  rank: number;

  // Which contested position this result came from. Kept so re-running a
  // tiebreak for one position can clear only its own stale results and
  // leave the other position's alone - and so the leaderboard knows
  // whether this rank should affect sorting or just the prize badge.
  position: ContestedPosition;

  resolvedAt: Timestamp;
}
