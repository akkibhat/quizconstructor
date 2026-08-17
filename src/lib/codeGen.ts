// Generates the short, human-typeable codes (e.g. "BRXK") used to reach a
// quiz from the Display/Controller/Leaderboard routes without typing its
// full Firestore document ID.
//
// Excludes visually-confusable characters (0/O, 1/I) since these codes get
// read off a screen and typed back in under time pressure.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

function randomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Generates a single random code. Not guaranteed unique - see createQuiz in lib/quizzes.ts, which retries on collision. */
export function generateQuizCode(): string {
  return randomCode(CODE_LENGTH);
}

// A team's recovery code (see lib/teams.ts, teamRecoveryCodes collection)
// has to stand on its own as an unguessable secret, unlike a quiz code
// which only ever needs to be hard to guess *for someone who doesn't
// already know it's this specific quiz*. Longer, for a much bigger
// keyspace - collision is left unchecked (unlike quiz codes) since the
// odds at this length are vanishingly small for a personal tool's scale.
const RECOVERY_CODE_LENGTH = 8;

export function generateRecoveryCode(): string {
  return randomCode(RECOVERY_CODE_LENGTH);
}
