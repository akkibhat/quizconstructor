import type { Timestamp } from "firebase/firestore";

// Firestore document at quizzes/{quizId}/longGame/{teamId} - one per team.
// Tracks whether/when a team locked in a correct Long Game guess. Once
// correctRoundPosition is set, the team is done - the scoring UI should
// stop offering them further Long Game guesses for the rest of the quiz.
export interface LongGameResult {
  // The round's 1-indexed *position* among sorted real rounds (1st round
  // = 1, 2nd = 2, ...) at which this team was marked correct, or null if
  // they haven't guessed correctly yet (and are still eligible to). This
  // is NOT the same as Round.order (a gapped sort key, e.g. 10/20/30) -
  // see the warning on Round.order for why conflating the two is a bug.
  correctRoundPosition: number | null;

  // Computed via calculateLongGamePoints (lib/scoring.ts) once at the
  // moment of marking and stored here - not re-derived later, since "once
  // locked, locked" should be a stored fact rather than something that
  // could shift if the round count or longGameMaxPoints changes afterwards.
  pointsAwarded: number | null;

  lockedAt: Timestamp | null;
}
