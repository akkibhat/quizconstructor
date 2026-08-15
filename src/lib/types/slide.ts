import type { AudioPlayMode } from "./question";

// Every kind of screen the presenter flow can show, in the order they can
// appear. See buildSlideList() for how a Quiz's rounds/questions get turned
// into a concrete list of these.
export type Slide =
  | { type: "round-title"; roundId: string; title: string }
  | {
      type: "question";
      roundId: string;
      questionId: string;
      text: string;
      imagePath: string | null;
      audioPath: string | null;
      audioPlayMode: AudioPlayMode;
    }
  | { type: "long-game-clue"; roundId: string; clueText: string; imagePath: string | null }
  | { type: "answers-divider"; roundId: string; title: string }
  | { type: "answer"; roundId: string; questionId: string; answerText: string }
  // Appears exactly once, after the final round's last answer slide - the
  // one-time reveal of the whole quiz's Long Game solution.
  | { type: "long-game-answer"; answerText: string }
  // The List round's single shared prompt, shown instead of per-question
  // slides - see Round.roundType.
  | { type: "list-prompt"; roundId: string; prompt: string }
  // The List round's reveal - the host's stored reference list, shown
  // instead of per-question answer slides.
  | { type: "list-answer"; roundId: string; answerReference: string };
