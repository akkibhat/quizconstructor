import type { Timestamp } from "firebase/firestore";

// How a question's attached audio behaves once its slide becomes current.
// "autoplay" is for generic background-clue music that should just start
// playing; "manual" is for "name that tune" / "guess the lyrics" style
// questions where the host wants to press Play themselves, for control and
// suspense. null means no audio is attached at all.
export type AudioPlayMode = "autoplay" | "manual" | null;

// Firestore document at
// quizzes/{quizId}/rounds/{roundId}/questions/{questionId}.
//
// Also doubles as a Long Game clue when its parent round has
// Round.isLongGame = true - in that case `text`/`imagePath` hold the clue
// and its image, while `answer`, `audioPath`, and `audioPlayMode` just go
// unused (there's no per-clue answer, only the quiz-level
// longGameFinalAnswer, and clues don't carry audio). Reusing this type
// rather than a separate one keeps all the round/question CRUD, hooks, and
// UI working for Long Game clues with no duplicated code - the round
// editor page just hides the irrelevant fields when isLongGame is true.
export interface Question {
  id: string;

  // 1-indexed position within the round. Same gapped-values reordering
  // scheme as Round.order.
  order: number;

  text: string;
  answer: string;

  // How many points this question is worth when fully correct - almost
  // always 1, but editable for the occasional multi-part question (e.g. a
  // full-name question worth 0.5 for each half) or a bonus question worth
  // more. Used by electronic scoring, where the scorer awards a
  // per-question point value (0, a partial amount, up to this max, or
  // beyond it for a deliberate bonus) that gets summed into the round's
  // total automatically - see lib/scoring.ts.
  points: number;

  // The choices shown beneath this question, if any - what turns a plain
  // question into a multiple-choice or Odd One Out one. Lettered A, B,
  // C... on the slide.
  //
  // There's no separate "which option is correct" field: `answer` above
  // already holds the correct answer's text, so the existing answer slide
  // and all of the scoring keep working untouched. null or empty renders
  // as an ordinary question.
  options: string[] | null;

  imagePath: string | null;
  audioPath: string | null;
  audioPlayMode: AudioPlayMode;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
