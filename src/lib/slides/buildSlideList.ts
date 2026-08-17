import { deriveAnswerPool } from "@/lib/answerPool";
import { effectiveFlavour, ROUND_FLAVOUR_LABELS } from "@/lib/roundFlavourLabels";
import type { Question } from "@/lib/types/question";
import type { Round } from "@/lib/types/round";
import type { Slide } from "@/lib/types/slide";

/**
 * Turns a quiz's rounds and questions into the exact sequence of slides
 * the presenter steps through.
 *
 * Pure, and never stored: Controller and Display each call it on the data
 * they already have, so both agree on what "slide 14" means.
 *
 * Per round: title -> questions -> Long Game clue (if enabled) ->
 * "Answers" divider -> answers. A Gauntlet round swaps the questions and
 * answers for its one shared prompt and one reveal. After every round, if
 * the Long Game is on, one last slide gives its answer.
 *
 * @param realRounds - the quiz's rounds excluding the Long Game one,
 *   sorted by `order`.
 * @param longGameClues - the Long Game round's clues, matched to
 *   realRounds *by position* rather than by id: clue i shows at the end of
 *   realRounds[i]. That's what keeps "clue 1 is the vaguest" true however
 *   the rounds are later reordered.
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
    // Derived from the round's own questions rather than a stored field -
    // see deriveAnswerPool - but only shown at all when the round opts in
    // via usesAnswerPool. Most rounds' answers are specific to their own
    // question and have nothing to pool; only rounds where the answers are
    // themselves the pool (e.g. matching numbers to questions) need it.
    const answerPool = round.usesAnswerPool
      ? deriveAnswerPool(questionsByRound[round.id] ?? [])
      : [];
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
          // Per-question, not per-round - a "standard" round can mix
          // question types, each with its own label. See effectiveFlavour.
          flavourLabel: ROUND_FLAVOUR_LABELS[effectiveFlavour(round, question)],
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
