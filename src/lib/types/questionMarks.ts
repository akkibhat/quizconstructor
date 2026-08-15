import type { Timestamp } from "firebase/firestore";

// Firestore document at
// quizzes/{quizId}/scores/{roundId}/questionMarks/{teamId} - one per team
// per round, only created when that team's answers for that round are
// marked electronically (see lib/electronicScoring.ts) rather than
// entered as a single paper-marked raw score. Kept as a subcollection
// under the round's scores doc since it's detail that only exists to
// support the electronic scoring UI - the actual score of record is
// always the same scores/{roundId}.entries[teamId] every other scoring
// path also writes to, recomputed as the sum of these marks on every
// change.
export interface QuestionMarks {
  // questionId -> points awarded for that question (0 up to the
  // question's Question.points, or beyond it for a deliberate bonus).
  // Absent entries mean "not marked yet", not "marked zero".
  marks: Record<string, number>;
  updatedAt: Timestamp;
}
