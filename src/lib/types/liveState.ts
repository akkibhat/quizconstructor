import type { Timestamp } from "firebase/firestore";

// What the Display route is currently showing: the round-by-round
// presenter flow, the standalone leaderboard, or a "drinks break" card.
export type LiveMode = "presenter" | "leaderboard" | "drinks-break";

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

  updatedAt: Timestamp;
  // Host's Firebase Auth UID, kept only for debugging - not used for
  // access control (the security rules check the quiz's hostUid, not this
  // field).
  updatedBy: string;
}
