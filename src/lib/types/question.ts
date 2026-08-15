import type { Timestamp } from "firebase/firestore";

// How a question's attached audio behaves once its slide becomes current.
// "autoplay" is for generic background-clue music that should just start
// playing; "manual" is for "name that tune" / "guess the lyrics" style
// questions where the host wants to press Play themselves, for control and
// suspense. null means no audio is attached at all.
export type AudioPlayMode = "autoplay" | "manual" | null;

// Firestore document at
// quizzes/{quizId}/rounds/{roundId}/questions/{questionId}.
export interface Question {
  id: string;

  // 1-indexed position within the round. Same gapped-values reordering
  // scheme as Round.order.
  order: number;

  text: string;
  answer: string;

  imagePath: string | null;
  audioPath: string | null;
  audioPlayMode: AudioPlayMode;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
