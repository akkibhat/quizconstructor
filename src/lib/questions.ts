import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { AudioPlayMode, Question } from "@/lib/types/question";

/** Adds a new blank question at the end of a round's question list. */
export async function addQuestion(quizId: string, roundId: string, existingQuestions: Question[]): Promise<void> {
  const highestOrder = existingQuestions.reduce((max, q) => Math.max(max, q.order), 0);

  await writeBatch(db)
    .set(doc(collection(db, "quizzes", quizId, "rounds", roundId, "questions")), {
      order: highestOrder + 10,
      text: "",
      answer: "",
      imagePath: null,
      audioPath: null,
      audioPlayMode: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    .commit();
}

export async function updateQuestion(
  quizId: string,
  roundId: string,
  questionId: string,
  updates: Partial<Pick<Question, "text" | "answer" | "imagePath" | "audioPath" | "audioPlayMode">>
): Promise<void> {
  await updateDoc(doc(db, "quizzes", quizId, "rounds", roundId, "questions", questionId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteQuestion(quizId: string, roundId: string, questionId: string): Promise<void> {
  await deleteDoc(doc(db, "quizzes", quizId, "rounds", roundId, "questions", questionId));
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
