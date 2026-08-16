import { serverTimestamp, type DocumentData, type Timestamp } from "firebase/firestore";

// "standard" is a normal round of questions. "list" is The Gauntlet: one
// shared prompt ("name any 10 of the top 25 busiest airports"), scored on
// how many a team got right in a row before their first miss. Still
// called "list" internally - it's only a code identifier. Only meaningful
// when isLongGame is false.
export type RoundType = "standard" | "list";

/**
 * A round's presentation style - the label above each question on the
 * projector. Cosmetic only: it changes nothing about the slide sequence
 * or the scoring.
 *
 * Kept as a separate axis from RoundType because RoundType marks The
 * Gauntlet, which genuinely rewrites the slide sequence. Merging them
 * would make a combination like a multiple-choice Gauntlet inexpressible.
 *
 * Most styles need nothing beyond this label: Finish the Lyric is a
 * question with audio, Picture This and Close-Up are questions with an
 * image.
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
  // Unlike themeNote this stays on screen under *every* question, since
  // the round only works if teams can see what's still unclaimed while
  // they decide.
  //
  // Stored as a clean array (see parseAnswerList in
  // lib/questionsImportExport.ts). null or empty = nothing shown.
  answerPool: string[] | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Fills in fields older round documents predate - see normaliseQuestion. */
export function normaliseRound(id: string, data: DocumentData): Round {
  const round = data as Omit<Round, "id">;
  return {
    ...round,
    id,
    roundType: round.roundType ?? "standard",
    listPrompt: round.listPrompt ?? null,
    listAnswerReference: round.listAnswerReference ?? null,
    flavour: round.flavour ?? "standard",
    themeNote: round.themeNote ?? null,
    answerPool: round.answerPool ?? null,
  };
}

/**
 * The complete field set for a new round document. Four places create
 * rounds - Add Round, Add The Gauntlet, and both halves of quiz
 * scaffolding - and each spelled the whole shape out, which is how the
 * scaffolding sites ended up missing three fields. Anything omitted here
 * gets the default a plain round starts with.
 */
export function newRoundFields(fields: {
  order: number;
  title: string;
  isLongGame?: boolean;
  roundType?: RoundType;
  listPrompt?: string | null;
  listAnswerReference?: string[] | null;
  flavour?: RoundFlavour;
  themeNote?: string | null;
  answerPool?: string[] | null;
}) {
  return {
    order: fields.order,
    title: fields.title,
    isLongGame: fields.isLongGame ?? false,
    roundType: fields.roundType ?? "standard",
    listPrompt: fields.listPrompt ?? null,
    listAnswerReference: fields.listAnswerReference ?? null,
    flavour: fields.flavour ?? "standard",
    themeNote: fields.themeNote ?? null,
    answerPool: fields.answerPool ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * The rounds that count as rounds. The Long Game is stored as one but
 * isn't part of the numbered sequence - it's excluded from the round
 * list, from numRounds, and from the reorder controls, and its position
 * is what the Long Game point formula counts against.
 */
export function realRoundsOf(rounds: Round[] | undefined): Round[] {
  return rounds?.filter((round) => !round.isLongGame) ?? [];
}
