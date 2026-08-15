import type { Timestamp } from "firebase/firestore";

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

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
