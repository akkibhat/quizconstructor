import type { Question } from "@/lib/types/question";
import { ROUND_FLAVOUR_LABELS, type Round } from "@/lib/types/round";
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
 * Sequence per *standard* round, repeated for every standard round in order:
 *   round title -> each question (no answer shown) -> Long Game clue
 *   (if enabled) -> "Answers" divider -> each answer, same order as the
 *   questions.
 * A round with roundType "list" (The Gauntlet - see Round.roundType)
 * instead gets: round title -> its single prompt -> Long Game clue (if
 * enabled) -> its single reveal. One shared prompt/reveal stands in for
 * the usual per-question slides, since it really is one shared question
 * with many answer slots rather than several distinct questions.
 * After every round has run through this, if Long Game is enabled, one
 * final slide reveals the overall Long Game answer.
 *
 * @param realRounds - every *non*-Long-Game round in the quiz, sorted by
 *   `order` ascending. (The Long Game round itself, if any, is passed
 *   separately via `longGameClues` - it isn't one of the rounds a slide
 *   sequence steps through in its own right.)
 * @param questionsByRound - each real round's questions, sorted by `order`
 *   ascending, keyed by roundId.
 * @param longGameEnabled - whether the quiz has the Long Game turned on.
 * @param longGameClues - the Long Game round's clues (stored as that
 *   round's "questions" - see Round.isLongGame), sorted by `order`
 *   ascending. Matched to realRounds *by position*, not by any shared ID:
 *   clue at index i is shown at the end of realRounds[i], whichever round
 *   that currently is. This is what makes "clue 1 is the vaguest, shown at
 *   the first round" hold regardless of how rounds get reordered.
 * @param longGameFinalAnswer - the quiz's overall Long Game solution, used
 *   for the one closing slide.
 */
export function buildSlideList(
  realRounds: Round[],
  questionsByRound: Record<string, Question[]>,
  longGameEnabled: boolean,
  longGameClues: Question[],
  longGameFinalAnswer: string
): Slide[] {
  const slides: Slide[] = [];

  realRounds.forEach((round, index) => {
    // Defaulted rather than assumed present: rounds created before these
    // fields existed won't have them, and this runs against whatever is
    // in Firestore right now.
    const answerPool = round.answerPool ?? [];
    const flavourLabel = ROUND_FLAVOUR_LABELS[round.flavour ?? "standard"];

    slides.push({
      type: "round-title",
      roundId: round.id,
      title: round.title,
      themeNote: round.themeNote ?? "",
      answerPool,
    });

    if (round.roundType === "list") {
      slides.push({ type: "list-prompt", roundId: round.id, prompt: round.listPrompt ?? "" });
    } else {
      const questions = questionsByRound[round.id] ?? [];
      for (const question of questions) {
        slides.push({
          type: "question",
          roundId: round.id,
          questionId: question.id,
          text: question.text,
          flavourLabel,
          options: question.options ?? [],
          answerPool,
          imagePath: question.imagePath,
          audioPath: question.audioPath,
          audioPlayMode: question.audioPlayMode,
        });
      }
    }

    const clue = longGameClues[index];
    if (longGameEnabled && clue) {
      slides.push({
        type: "long-game-clue",
        roundId: round.id,
        clueText: clue.text,
        imagePath: clue.imagePath,
      });
    }

    if (round.roundType === "list") {
      slides.push({
        type: "list-answer",
        roundId: round.id,
        answerReference: round.listAnswerReference ?? [],
      });
    } else {
      const questions = questionsByRound[round.id] ?? [];
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
  });

  if (longGameEnabled) {
    slides.push({ type: "long-game-answer", answerText: longGameFinalAnswer });
  }

  return slides;
}
