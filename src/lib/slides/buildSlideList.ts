import type { Question } from "@/lib/types/question";
import { ROUND_FLAVOUR_LABELS, type Round } from "@/lib/types/round";
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
    // null on the round means "not set"; the slide types want an empty
    // list, so the conversion happens once here.
    const answerPool = round.answerPool ?? [];
    const flavourLabel = ROUND_FLAVOUR_LABELS[round.flavour];

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
