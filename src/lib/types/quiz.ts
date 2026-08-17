import type { Timestamp } from "firebase/firestore";

// A quiz's lifecycle. "setup" is while the host is still building content
// and teams are signing up; "live" once the presenter has started running
// through slides; "complete" once the night is over. Team double-round
// picks can only be written while status is "setup" - see the security
// rules and the team-setup UI.
export type QuizStatus = "setup" | "live" | "complete";

// Firestore document at quizzes/{quizId}. quizId is a normal Firestore
// auto-ID; `code` is the separate, short, human-typeable code (e.g. "BRXK")
// used to reach this quiz from the Display/Controller/etc without typing
// the full ID. The mapping from code -> quizId lives in the quizCodes
// collection (see quizCode.ts) so codes can be looked up without exposing
// a listable query over all quizzes.
export interface Quiz {
  id: string;
  title: string;
  date: Timestamp;
  code: string;
  hostUid: string;

  // Convenience mirror of rounds.length, kept in sync whenever a round is
  // added/removed. Display-only - never use this for the Long Game point
  // formula, since it can briefly be stale mid-edit. Always compute the
  // point value from the *live* round count at scoring time instead.
  numRounds: number;

  longGameEnabled: boolean;
  // The overall solution to the Long Game puzzle. Stored as a normal,
  // code-readable field (not behind an auth-only doc) because the Display
  // route needs to show it as the final slide of the whole quiz, and
  // Display never has a login - only the quiz code.
  longGameFinalAnswer: string;
  // Points awarded for a correct guess at round 1, decreasing to exactly 1
  // by the last round (see calculateLongGamePoints in lib/scoring.ts).
  // Only meaningful when longGameEnabled is true. Independent of any
  // round's actual question count - it's just the value you've chosen,
  // typically matching how many questions are in a round.
  longGameMaxPoints: number;

  doublePointsEnabled: boolean;
  // How many rounds each team gets to flag as their own personal double
  // points round. Only meaningful when doublePointsEnabled is true.
  doublePointsPicksPerTeam: number;

  // Opt-in per quiz - off by default, since most nights still run on
  // paper/host-typed teams. When true, /answer/[code] accepts self-
  // service registration (one phone per team, via anonymous Firebase
  // Auth - see Team.ownerUid) and live answer submissions. Toggled
  // anytime pre-quiz via updateQuiz, not creation-time-only like
  // doublePointsEnabled/longGameEnabled above.
  allowsPhoneAnswering: boolean;

  // A second, independent opt-in on top of allowsPhoneAnswering - some
  // hosts want digital answering without the room seeing a live tally of
  // what everyone guessed before the reveal (it can spoil the "drumroll"
  // moment, or just isn't everyone's taste). Only meaningful when
  // allowsPhoneAnswering is also true; the toggle for this is hidden
  // otherwise rather than left in a confusing enabled-but-irrelevant state.
  allowsLiveAnswerReveal: boolean;

  status: QuizStatus;

  // Soft delete only - Firestore doesn't cascade-delete subcollections, so
  // quizzes are never hard-deleted in v1. Archived quizzes are just hidden
  // from the "my quizzes" list.
  archived: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
