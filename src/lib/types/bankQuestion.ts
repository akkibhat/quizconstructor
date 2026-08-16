import type { Timestamp } from "firebase/firestore";

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
