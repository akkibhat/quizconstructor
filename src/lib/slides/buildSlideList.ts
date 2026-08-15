import type { Question } from "@/lib/types/question";
import type { Round } from "@/lib/types/round";
import type { Slide } from "@/lib/types/slide";

/**
 * Turns a quiz's rounds and questions into the exact, deterministic
 * sequence of slides the presenter steps through.
 *
 * This is a pure function on purpose: it's never stored in Firestore.
 * Both the Controller and Display routes call it independently on the same
 * rounds/questions data they already subscribe to, so they always agree on
 * what "slide index 14" means - Next/Previous just moves an index into
 * this array.
 *
 * Sequence per round, repeated for every round in order:
 *   round title -> each question (no answer shown) -> Long Game clue
 *   (if enabled) -> "Answers" divider -> each answer, same order as the
 *   questions.
 * After every round has run through this, if Long Game is enabled, one
 * final slide reveals the overall Long Game answer.
 *
 * @param rounds - every round in the quiz, sorted by `order` ascending.
 * @param questionsByRound - each round's questions, sorted by `order`
 *   ascending, keyed by roundId.
 * @param longGameEnabled - whether the quiz has the Long Game turned on.
 * @param longGameFinalAnswer - the quiz's overall Long Game solution, used
 *   for the one closing slide.
 */
export function buildSlideList(
  rounds: Round[],
  questionsByRound: Record<string, Question[]>,
  longGameEnabled: boolean,
  longGameFinalAnswer: string
): Slide[] {
  const slides: Slide[] = [];

  for (const round of rounds) {
    slides.push({ type: "round-title", roundId: round.id, title: round.title });

    const questions = questionsByRound[round.id] ?? [];
    for (const question of questions) {
      slides.push({
        type: "question",
        roundId: round.id,
        questionId: question.id,
        text: question.text,
        imagePath: question.imagePath,
        audioPath: question.audioPath,
        audioPlayMode: question.audioPlayMode,
      });
    }

    if (longGameEnabled && round.longGameClueText) {
      slides.push({
        type: "long-game-clue",
        roundId: round.id,
        clueText: round.longGameClueText,
        imagePath: round.longGameClueImagePath,
      });
    }

    slides.push({
      type: "answers-divider",
      roundId: round.id,
      title: `${round.title} — Answers`,
    });
    for (const question of questions) {
      slides.push({
        type: "answer",
        roundId: round.id,
        questionId: question.id,
        answerText: question.answer,
      });
    }
  }

  if (longGameEnabled) {
    slides.push({ type: "long-game-answer", answerText: longGameFinalAnswer });
  }

  return slides;
}
