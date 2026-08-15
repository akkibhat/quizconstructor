import type { Timestamp } from "firebase/firestore";

// Firestore document at tiebreakQuestions/{id} - a TOP-LEVEL collection,
// deliberately not nested under any quiz. This is a reusable bank the
// host builds up once and draws from across every quiz, e.g. "What's the
// circumference of the globe in km?" -> 40075. Closest guess wins when
// used to break a tie - see lib/tieDetection.ts and the `tiebreak` fields
// on LiveState for how a question gets pulled from here into a live quiz.
export interface TiebreakQuestion {
  id: string;
  question: string;
  answer: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
