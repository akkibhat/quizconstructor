// Generates the short, human-typeable codes (e.g. "BRXK") used to reach a
// quiz from the Display/Controller/Leaderboard routes without typing its
// full Firestore document ID.
//
// Excludes visually-confusable characters (0/O, 1/I) since these codes get
// read off a screen and typed back in under time pressure.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

/** Generates a single random code. Not guaranteed unique - see createQuiz in lib/quizzes.ts, which retries on collision. */
export function generateQuizCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}
