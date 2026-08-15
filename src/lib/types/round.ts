import type { Timestamp } from "firebase/firestore";

// "standard" is a normal round built from Question docs. "list" is The
// Gauntlet - a single-prompt round ("name any 10 of the top 25 busiest
// airports") scored on how many correct answers a team gave in a row
// before their first miss, using the same raw-score input every other
// round already has (see the plan doc for why no new scoring UI was
// needed). Kept as the internal value "list" (not renamed to match the
// user-facing "Gauntlet" name) since it's just a code identifier, not
// something anyone but a developer reading this ever sees. Only
// meaningful when isLongGame is false - the two round specializations are
// independent axes, not alternatives to each other.
export type RoundType = "standard" | "list";

/**
 * A round's presentation style. Purely cosmetic: it sets the label shown
 * above each question on the projector and gives the host a name for what
 * they're building. It deliberately does NOT change the slide sequence,
 * the scoring, or anything structural.
 *
 * That's why it's a separate axis from RoundType rather than more values
 * on it. RoundType distinguishes The Gauntlet, which genuinely rewrites
 * the slide sequence (one shared prompt instead of per-question slides).
 * Everything here keeps the normal title -> questions -> answers flow and
 * only changes how a question looks - so folding the two together would
 * make combinations like "a multiple-choice Gauntlet" impossible to
 * express without a special case.
 *
 * Several styles need no machinery at all beyond this label: Finish the
 * Lyric is a question with audio attached, and Picture This and Close-Up
 * are questions with an image - all of which already worked.
 */
export type RoundFlavour =
  | "standard"
  | "true-false"
  | "multiple-choice"
  | "odd-one-out"
  | "finish-the-lyric"
  | "picture-this"
  | "close-up";

/** What each flavour is called on screen, and in the round editor's dropdown. */
export const ROUND_FLAVOUR_LABELS: Record<RoundFlavour, string> = {
  standard: "Question",
  "true-false": "True or False",
  "multiple-choice": "Multiple Choice",
  "odd-one-out": "Odd One Out",
  "finish-the-lyric": "Finish the Lyric",
  "picture-this": "Picture This",
  "close-up": "Close-Up",
};

// Firestore document at quizzes/{quizId}/rounds/{roundId}.
export interface Round {
  id: string;

  // A sort key, not a literal position count - uses gapped values (10, 20,
  // 30, ...) rather than consecutive integers, so dragging a round to a
  // new position only ever needs to update the 1-2 rounds it moved past,
  // not renumber the whole list. Do NOT plug this into the Long Game point
  // formula directly (numRounds - order + 1 is wrong for anything but the
  // very first round) - that formula needs the round's actual 1-indexed
  // *position* among sorted real rounds, e.g. realRounds.indexOf(round) + 1.
  order: number;

  title: string;

  // Marks this as the special Long Game round rather than a normal round
  // of questions - see the comment on Question.answer for why the Long
  // Game reuses the round/question structure instead of its own types.
  // At most one round per quiz has this set to true. Long Game rounds are
  // excluded from the normal numbered rounds list, from numRounds, and
  // from the up/down round-reorder controls - buildSlideList threads
  // their questions (clues) back into the presenter flow by position
  // (1st clue at the end of the 1st real round, and so on).
  isLongGame: boolean;

  // Which kind of real round this is - irrelevant (but still set to
  // "standard") when isLongGame is true. At most one round per quiz has
  // roundType "list" - see addListRound in lib/rounds.ts, which enforces
  // that.
  roundType: RoundType;

  // Only used when roundType === "list" (The Gauntlet). The single prompt
  // shown to the room (e.g. "Name any 10 of the top 25 busiest airports in
  // the world").
  listPrompt: string | null;
  // Only used when roundType === "list" (The Gauntlet). The valid-answer
  // reference - doubles as both the host's own cheat sheet while marking
  // and the "answer" slide revealed to the room afterwards. Stored as a
  // clean array of individual answers (one per entry), not raw pasted
  // text - see parseAnswerList in lib/questionsImportExport.ts, which the
  // round editor runs on whatever's pasted before saving, so a messy
  // paste (extra numbering, blank lines) still ends up as a tidy list.
  listAnswerReference: string[] | null;

  // How this round's questions are presented - see RoundFlavour. Cosmetic
  // only; "standard" behaves exactly as rounds always have.
  flavour: RoundFlavour;

  // A rule covering the whole round's answers, shown once on the round's
  // title slide - e.g. "Every answer begins with S". Free text because
  // the possibilities are endless and the app never needs to interpret
  // it, only display it. null = nothing shown.
  themeNote: string | null;

  // A fixed set of values that the round's answers are drawn from, each
  // used exactly once - e.g. eight numbers where one is the answer to
  // each question.
  //
  // Unlike themeNote this is shown under *every* question in the round,
  // not just the title slide: the whole point is that teams weigh up
  // which remaining value fits, so the list has to stay on screen while
  // they're answering. Values are deliberately chosen to look plausible
  // for more than one question, which is what makes the round work.
  //
  // Stored as a clean array (see parseAnswerList in
  // lib/questionsImportExport.ts). null or empty = nothing shown.
  answerPool: string[] | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
