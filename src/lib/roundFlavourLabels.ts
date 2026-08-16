import type { RoundFlavour } from "@/lib/types/round";

/**
 * What each RoundFlavour is called on screen - the round editor's
 * dropdown and the eyebrow label buildSlideList puts on a question
 * slide. Kept separate from the type definition in types/round.ts: this
 * is display copy, not part of the data shape.
 */
export const ROUND_FLAVOUR_LABELS: Record<RoundFlavour, string> = {
  standard: "Question",
  "true-false": "True or False",
  "multiple-choice": "Multiple Choice",
  "odd-one-out": "Odd One Out",
  "finish-the-lyric": "Finish the Lyric",
  "picture-this": "Picture This",
  "close-up": "Close-Up",
};
