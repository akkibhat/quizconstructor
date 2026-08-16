import type { Question } from "@/lib/types/question";

/**
 * A short, stable string hash - good enough to sort by, not for anything
 * cryptographic. The finalizer step (from MurmurHash3) matters here more
 * than it would elsewhere: without it, two ids differing only in their
 * last character hash to nearly the same value, so a family of ids like
 * "clue1".."clue6" would sort right back into their original order -
 * exactly the "spoiler" ordering this function exists to avoid.
 */
function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash;
}

/**
 * A round's answer pool, derived from its own questions' answers rather
 * than typed separately - so there's nothing that can drift out of sync
 * with the questions the host is actually editing. Blank answers are
 * skipped, since an unanswered question shouldn't show up as a claimable
 * value yet.
 *
 * Ordered by a hash of each question's id rather than question order -
 * sequential order would hand the room "value 1 is the answer to
 * question 1", which defeats the whole "which value fits where" point of
 * the round. The hash is deterministic, so Controller and Display (which
 * call this independently, same as buildSlideList) always agree on the
 * order without needing anything stored.
 */
export function deriveAnswerPool(questions: Question[]): string[] {
  return questions
    .map((question) => ({ id: question.id, value: question.answer.trim() }))
    .filter((entry) => entry.value !== "")
    .sort((a, b) => stableHash(a.id) - stableHash(b.id))
    .map((entry) => entry.value);
}

/**
 * Answers that appear more than once in a round - a genuine problem for
 * an answer-pool round, since the mechanic assumes every value is
 * claimed by exactly one question. Surfaced as a warning in the editor;
 * never blocks anything, since a host mid-edit will often have
 * duplicates temporarily.
 */
export function duplicateAnswers(questions: Question[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const question of questions) {
    const value = question.answer.trim();
    if (value === "") continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}
