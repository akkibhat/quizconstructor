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

/** How a flavour wants its options field handled in the editor. */
export type OptionsMode =
  | "none" // no options field shown at all
  | "true-false" // a fixed True/False toggle, not a free list
  | "list"; // a free multi-option list (Multiple Choice, Odd One Out)

/**
 * Everything the round editor and the flavour explainer need to know
 * about a flavour beyond its label: what it means, what answer it
 * expects, how it looks on the projector, and which QuestionEditor
 * fields are relevant to it.
 *
 * One registry rather than scattered `if (flavour === ...)` checks - the
 * editor and the explainer accordion both read this, so the two can't
 * drift out of sync with each other.
 */
export interface RoundFlavourInfo {
  description: string;
  expects: string;
  projector: string;
  fields: {
    options: OptionsMode;
    // Minimum options before the editor stops warning - only meaningful
    // when options is "list".
    minOptions?: number;
    image: boolean;
    audio: boolean;
  };
}

export const ROUND_FLAVOUR_INFO: Record<RoundFlavour, RoundFlavourInfo> = {
  standard: {
    description: "An ordinary open question - the room answers in their own words.",
    expects: "Free-text answer. No options, image or audio required.",
    projector: "Question text, with the answer revealed afterwards.",
    fields: { options: "none", image: true, audio: true },
  },
  "true-false": {
    description: "A statement the room judges true or false.",
    expects: 'The answer is fixed to "True" or "False" - use the shortcut buttons below.',
    projector: 'The statement, with "True or False" as its label.',
    fields: { options: "true-false", image: true, audio: false },
  },
  "multiple-choice": {
    description: "A question with several options, one correct.",
    expects: "2-6 options, lettered A/B/C… on the slide. `Answer` must match one of them exactly.",
    projector: "The question with lettered options underneath it.",
    fields: { options: "list", minOptions: 2, image: true, audio: false },
  },
  "odd-one-out": {
    description: "A list of items where one doesn't belong.",
    expects: "3-6 items as options; `Answer` is the odd one out, matching one of them exactly.",
    projector: "The prompt with lettered items underneath, same as Multiple Choice.",
    fields: { options: "list", minOptions: 3, image: true, audio: false },
  },
  "finish-the-lyric": {
    description: "A lyric plays and the room finishes it.",
    expects: "Attach audio below (manual play mode suits this - press Play when ready).",
    projector: "The lyric prompt, with the answer revealed as the missing words.",
    fields: { options: "none", image: false, audio: true },
  },
  "picture-this": {
    description: "An image the room has to identify or interpret.",
    expects: "Attach an image below. The question text is optional context.",
    projector: "The image, with the question text (if any) above it.",
    fields: { options: "none", image: true, audio: false },
  },
  "close-up": {
    description: "A tight crop of something - a face, a logo, a detail.",
    expects: "Attach a cropped image below. Works well paired with a wider reveal as the answer.",
    projector: "The cropped image, revealed at full size on the answer slide.",
    fields: { options: "none", image: true, audio: false },
  },
};
