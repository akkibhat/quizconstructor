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
  // reference the host pastes in while building the round - doubles as
  // both their own cheat sheet while marking and the "answer" slide
  // revealed to the room afterwards.
  listAnswerReference: string | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
