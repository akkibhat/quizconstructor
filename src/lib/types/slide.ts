import type { AudioPlayMode } from "./question";

// Every kind of screen the presenter flow can show, in the order they can
// appear. See buildSlideList() for how a Quiz's rounds/questions get turned
// into a concrete list of these.
export type Slide =
  | {
      type: "round-title";
      roundId: string;
      title: string;
      // A rule covering the whole round, e.g. "Every answer begins with
      // S" - see Round.themeNote. Empty string = nothing to show.
      themeNote: string;
      // The round's fixed set of answers, if it has one - shown here as
      // well as under each question so the room sees it up front.
      answerPool: string[];
    }
  | {
      type: "question";
      roundId: string;
      questionId: string;
      text: string;
      // What to call this on screen - "Question", "True or False",
      // "Picture This" and so on. Comes from the round's flavour.
      flavourLabel: string;
      // Multiple-choice / Odd One Out choices, lettered on the slide.
      // Empty = an ordinary open question.
      options: string[];
      // Repeated on every question in the round on purpose: teams need
      // the remaining values in front of them while deciding which one
      // fits. See Round.answerPool.
      answerPool: string[];
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
  // The Gauntlet's single shared prompt, shown instead of per-question
  // slides - see Round.roundType.
  | { type: "list-prompt"; roundId: string; prompt: string }
  // The Gauntlet's reveal - the host's stored reference list, shown
  // instead of per-question answer slides.
  | { type: "list-answer"; roundId: string; answerReference: string[] };
