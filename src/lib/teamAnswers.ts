import { collection, doc, getDoc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { effectiveFlavour } from "@/lib/roundFlavourLabels";
import { newTeamAnswerFields } from "@/lib/types/teamAnswer";
import type { Question } from "@/lib/types/question";
import type { Round } from "@/lib/types/round";
import type { Team } from "@/lib/types/team";

// Flavours whose answer is one of a fixed set of options, so an exact
// (trimmed, case-insensitive) match against Question.answer is a safe
// auto-grade - there's no phrasing ambiguity the way there is with a
// free-text Standard answer. Kept as its own list rather than reusing
// QUESTION_FLAVOURS/ROUND_LOCKABLE_FLAVOURS from roundFlavourLabels.ts,
// since this is a scoring concern, not a rendering one, and the two lists
// happening to overlap for these three values is coincidental.
const AUTO_GRADABLE_FLAVOURS = new Set(["true-false", "multiple-choice", "odd-one-out"]);

function normaliseForMatch(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * A team's own device submits its answer to whichever question is
 * currently live. Only accepted by the security rules when
 * submittedAtSlideIndex matches liveState/current.slideIndex - answering
 * ahead or editing after the question has moved on is rejected server-side,
 * not just hidden client-side.
 */
export async function submitAnswer(
  quizId: string,
  teamId: string,
  questionId: string,
  text: string,
  slideIndex: number
): Promise<void> {
  await writeBatch(db)
    .set(
      doc(db, "quizzes", quizId, "teams", teamId, "answers", questionId),
      newTeamAnswerFields({ questionId, text: text.trim(), submittedAtSlideIndex: slideIndex })
    )
    .commit();
}

/**
 * Host-side only: grades every team's submitted answers for the
 * auto-gradable flavours in one round, then writes the results through
 * the exact same scores/{roundId} + questionMarks shape setQuestionMark
 * writes - so this plugs into the existing electronic-scoring pipeline
 * rather than a parallel one, and marks a host has already entered by
 * hand for free-text questions are preserved (merged in, not overwritten).
 *
 * Deliberately NOT something a team's own device could ever do itself -
 * scores/questionMarks stay host-only in firestore.rules. A team can only
 * ever write its own answer *text*; converting that into points always
 * goes through this function, run by someone already authorized to write
 * scores.
 */
export async function autoGradeRound(
  quizId: string,
  round: Round,
  questions: Question[],
  teams: Team[]
): Promise<number> {
  const gradable = questions.filter((q) => AUTO_GRADABLE_FLAVOURS.has(effectiveFlavour(round, q)));
  if (gradable.length === 0 || teams.length === 0) {
    return 0;
  }

  const batch = writeBatch(db);
  let gradedCount = 0;

  for (const team of teams) {
    const [marksSnap, answersSnap] = await Promise.all([
      getDoc(doc(db, "quizzes", quizId, "scores", round.id, "questionMarks", team.id)),
      getDocs(collection(db, "quizzes", quizId, "teams", team.id, "answers")),
    ]);

    const currentMarks = (marksSnap.data()?.marks as Record<string, number>) ?? {};
    const answersByQuestionId = new Map(answersSnap.docs.map((d) => [d.id, d.data().text as string]));

    const newMarks = { ...currentMarks };
    for (const question of gradable) {
      const submitted = answersByQuestionId.get(question.id);
      if (submitted === undefined) continue; // team never answered this one
      const isCorrect = normaliseForMatch(submitted) === normaliseForMatch(question.answer);
      newMarks[question.id] = isCorrect ? question.points : 0;
      gradedCount++;
    }

    const raw = Object.values(newMarks).reduce((sum, points) => sum + points, 0);
    const isDoubled = team.doubleRoundPicks.includes(round.id);

    batch.set(doc(db, "quizzes", quizId, "scores", round.id, "questionMarks", team.id), {
      marks: newMarks,
      updatedAt: serverTimestamp(),
    });
    batch.set(
      doc(db, "quizzes", quizId, "scores", round.id),
      { entries: { [team.id]: { raw, isDoubled, points: isDoubled ? raw * 2 : raw } }, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  await batch.commit();
  return gradedCount;
}
