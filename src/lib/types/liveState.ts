import type { Timestamp } from "firebase/firestore";

// What the Display route is currently showing: the round-by-round
// presenter flow, the standalone leaderboard, a "drinks break" card, or a
// tiebreak in progress.
export type LiveMode = "presenter" | "leaderboard" | "drinks-break" | "tiebreak";

export type ContestedPosition = "top" | "second-to-last";
export type TiebreakMode = "app-computes" | "manual";

// The active tiebreak, if any - lives on the same liveState doc rather
// than a separate one, same reasoning as leaderboardRevealStage: Display
// just needs one thing to subscribe to. Populated by startTiebreak (see
// lib/liveState.ts) and left in place after the tiebreak ends (mode flips
// back to "leaderboard") so re-opening it shows what was last run.
export interface TiebreakState {
  questionText: string;
  // The correct answer is denormalized here (not looked up from the
  // auth-only tiebreakQuestions bank at render time) so Display - which
  // only ever has the quiz code, never a login - can show it once
  // revealed. This means, same as every other slide's content, a curious
  // person with the code and devtools could technically read it before
  // it's revealed - the same accepted v1 tradeoff documented in the plan
  // doc's security rules section, not a new one.
  correctAnswer: number;
  contestedPosition: ContestedPosition;
  mode: TiebreakMode;
  // Which teams are actually contesting this tiebreak, captured at the
  // moment it started - needed so the guess-entry UI (and Display) know
  // who to show, since the live leaderboard could theoretically shift
  // once scoring continues after this tiebreak is resolved.
  contestedTeamIds: string[];
  // teamId -> guess, only meaningful in "app-computes" mode.
  guesses: Record<string, number>;
  // Whether Display should show the correct answer (and, in app-computes
  // mode, the guesses and computed winner) yet, or just the question.
  revealed: boolean;
}

// Firestore document at quizzes/{quizId}/liveState/current - the single
// realtime sync point shared by the Controller, Display, and Leaderboard
// routes. Controller writes to this doc; Display and Leaderboard both just
// subscribe to it. Keeping this as one small doc (rather than separate
// state for the leaderboard) is deliberate - "go to leaderboard" is just
// flipping `mode`, and `slideIndex` stays untouched so resuming the
// presenter flow picks up exactly where it left off.
export interface LiveState {
  mode: LiveMode;

  // Index into the slide list built by buildSlideList() (see
  // lib/slides/buildSlideList.ts). The slide list itself is never stored -
  // both Controller and Display compute it independently from the same
  // rounds/questions data, so this index means the same thing to both.
  slideIndex: number;

  // How much of the leaderboard has been revealed, for the progressive
  // "press a key to reveal the next third" presentation mode.
  // 0 = nothing shown, 1 = bottom third, 2 = + middle third, 3 = everyone.
  leaderboardRevealStage: 0 | 1 | 2 | 3;

  tiebreak: TiebreakState | null;

  updatedAt: Timestamp;
  // Host's Firebase Auth UID, kept only for debugging - not used for
  // access control (the security rules check the quiz's hostUid, not this
  // field).
  updatedBy: string;
}
