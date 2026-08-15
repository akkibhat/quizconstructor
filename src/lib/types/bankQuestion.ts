import type { Timestamp } from "firebase/firestore";

/**
 * Firestore document at questionBank/{questionId} - a **top-level**
 * collection, not nested under any quiz, because the whole point is that
 * it outlives individual quiz nights. Same shape of decision as
 * tiebreakQuestions: auth-only rather than code-readable, since it's the
 * host's own private stock of material rather than anything a room full
 * of guests should be able to browse.
 *
 * The bank is a *pool* per category, not a set of pre-built rounds. A
 * category accumulates questions over time and each quiz draws a handful
 * from it, so "Geography" ends up being a year of quizzes rather than a
 * single fixed round.
 */
export interface BankQuestion {
  id: string;

  // Free text rather than a fixed enum - a category comes into existence
  // simply by being typed on a question, and the bank page offers the
  // existing ones as autocomplete. Avoids maintaining a separate list of
  // categories that could end up with orphans or empties.
  category: string;

  text: string;
  answer: string;
  points: number;

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
