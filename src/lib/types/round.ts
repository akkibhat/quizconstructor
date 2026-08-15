import type { Timestamp } from "firebase/firestore";

// Firestore document at quizzes/{quizId}/rounds/{roundId}.
export interface Round {
  id: string;

  // 1-indexed position of this round within the quiz. Deliberately
  // 1-indexed (not 0-indexed) so it plugs directly into the Long Game point
  // formula (numRounds - order + 1) without any off-by-one adjustment.
  //
  // Uses gapped values (10, 20, 30, ...) rather than consecutive integers,
  // so dragging a round to a new position only ever needs to update the
  // 1-2 rounds it moved past, not renumber the whole list.
  order: number;

  title: string;

  // The Long Game clue revealed at the end of this round, only used when
  // the parent quiz has longGameEnabled = true. null until the host fills
  // it in.
  longGameClueText: string | null;
  longGameClueImagePath: string | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
