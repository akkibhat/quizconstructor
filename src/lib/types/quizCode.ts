// Firestore document at quizCodes/{code} - doc ID is the 4-letter code
// itself (e.g. "BRXK"). This is a thin lookup layer, kept separate from the
// quiz document on purpose: security rules can allow `get` on this
// collection (so anyone who types a valid code can resolve it) while still
// blocking `list` entirely, so codes can never be enumerated by scanning
// the collection.
export interface QuizCode {
  quizId: string;
}
