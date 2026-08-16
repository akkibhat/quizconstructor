import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { newQuestionFields, type AudioPlayMode, type Question } from "@/lib/types/question";

/** Adds a new blank question at the end of a round's question list. */
export async function addQuestion(quizId: string, roundId: string, existingQuestions: Question[]): Promise<void> {
  const highestOrder = existingQuestions.reduce((max, q) => Math.max(max, q.order), 0);

  await writeBatch(db)
    .set(
      doc(collection(db, "quizzes", quizId, "rounds", roundId, "questions")),
      newQuestionFields({ order: highestOrder + 10 })
    )
    .commit();
}

export async function updateQuestion(
  quizId: string,
  roundId: string,
  questionId: string,
  updates: Partial<
    Pick<
      Question,
      "text" | "answer" | "points" | "options" | "imagePath" | "audioPath" | "audioPlayMode"
    >
  >
): Promise<void> {
  await updateDoc(doc(db, "quizzes", quizId, "rounds", roundId, "questions", questionId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteQuestion(quizId: string, roundId: string, questionId: string): Promise<void> {
  await deleteDoc(doc(db, "quizzes", quizId, "rounds", roundId, "questions", questionId));
}

/**
 * Copies a question, inserted directly after the original - handy for a
 * run of similar questions (e.g. five True/False in a row) without
 * retyping the shared fields. Slots into the gap before the next question
 * rather than appending at the end, using the same gapped-order scheme as
 * addRound/addQuestion; if there's no room left in the gap (two questions
 * already sitting back-to-back) it lands fractionally between them, which
 * is fine since `order` is only ever used to sort, never displayed.
 */
export async function duplicateQuestion(
  quizId: string,
  roundId: string,
  questions: Question[],
  question: Question
): Promise<void> {
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  const nextOrder = sorted.find((q) => q.order > question.order)?.order;
  const order = nextOrder !== undefined ? (question.order + nextOrder) / 2 : question.order + 10;

  await writeBatch(db)
    .set(
      doc(collection(db, "quizzes", quizId, "rounds", roundId, "questions")),
      newQuestionFields({
        order,
        text: question.text,
        answer: question.answer,
        points: question.points,
        options: question.options,
        imagePath: question.imagePath,
        audioPath: question.audioPath,
        audioPlayMode: question.audioPlayMode,
      })
    )
    .commit();
}

/** Same swap-based reordering approach as swapRoundOrder in lib/rounds.ts. */
export async function swapQuestionOrder(
  quizId: string,
  roundId: string,
  questionA: Question,
  questionB: Question
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "quizzes", quizId, "rounds", roundId, "questions", questionA.id), {
    order: questionB.order,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, "quizzes", quizId, "rounds", roundId, "questions", questionB.id), {
    order: questionA.order,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export type { AudioPlayMode };
