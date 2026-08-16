import type { DocumentData, Timestamp } from "firebase/firestore";

import type { RoundFlavour } from "@/lib/types/round";

/**
 * Firestore document at questionBank/{questionId} - top-level, since the
 * bank outlives any one quiz night. Auth-only like tiebreakQuestions:
 * it's the host's own stock, not something a room with the code should
 * be able to read.
 *
 * A category is a *pool*, not a pre-built round - it grows over time and
 * each quiz draws a handful from it.
 */
export interface BankQuestion {
  id: string;

  // Free text rather than a fixed enum - a category comes into existence
  // simply by being typed on a question, and the bank page offers the
  // existing ones as autocomplete. Avoids maintaining a separate list of
  // categories that could end up with orphans or empties.
  category: string;

  // What kind of question this is (standard, true/false, multiple choice,
  // ...) - the same enum a round's flavour uses. A category pool can mix
  // flavours (e.g. Geography holds both plain and true/false questions),
  // so the round editor's bank picker filters by category *and* this,
  // to only ever surface questions that fit the round being built.
  flavour: RoundFlavour;

  text: string;
  answer: string;
  points: number;

  // Choices for flavours that need them (multiple choice, odd one out) -
  // same shape and meaning as Question.options. null for flavours that
  // don't use options.
  options: string[] | null;

  // --- Usage tracking -----------------------------------------------
  // Recorded when a question is pulled into a quiz round, so the picker
  // can flag or hide anything already used. This is what stops a weekly
  // quiz at the same venue quietly repeating itself.
  //
  // Deliberately a denormalised summary rather than a full history
  // subcollection: the only thing the UI needs to answer is "have I used
  // this, and when", which one timestamp covers at a fraction of the
  // reads. Note it records being *added to a round*, not the quiz
  // actually being played - and it isn't rolled back if the round is
  // later deleted, so treat it as "has been drawn" rather than gospel.
  usageCount: number;
  lastUsedAt: Timestamp | null;
  lastUsedQuizId: string | null;
  lastUsedQuizTitle: string | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Fills in fields that bank questions saved before flavour/options existed
 * won't have - same reasoning as normaliseQuestion. Legacy questions default
 * to "standard", same as a round that's never had its flavour changed.
 */
export function normaliseBankQuestion(id: string, data: DocumentData): BankQuestion {
  const question = data as Omit<BankQuestion, "id">;
  return {
    ...question,
    id,
    flavour: question.flavour ?? "standard",
    options: question.options ?? null,
  };
}
