import type { Timestamp } from "firebase/firestore";

// Firestore document at quizzes/{quizId}/longGame/{teamId} - one per team.
// Tracks whether/when a team locked in a correct Long Game guess. Once
// correctRoundOrder is set, the team is done - the scoring UI should stop
// offering them further Long Game guesses for the rest of the quiz.
export interface LongGameResult {
  // The round.order at which this team was marked correct, or null if
  // they haven't guessed correctly yet (and are still eligible to).
  correctRoundOrder: number | null;

  // numRounds_live - correctRoundOrder + 1, computed once at the moment of
  // marking and stored here - not re-derived later, since "once locked,
  // locked" should be a stored fact rather than something that could shift
  // if the round count changes afterwards.
  pointsAwarded: number | null;

  lockedAt: Timestamp | null;
}
