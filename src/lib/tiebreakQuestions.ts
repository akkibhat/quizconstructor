import { collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase/client";

export async function addTiebreakQuestion(question: string, answer: number): Promise<void> {
  const ref = doc(collection(db, "tiebreakQuestions"));
  await setDoc(ref, {
    question,
    answer,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTiebreakQuestion(
  id: string,
  updates: Partial<{ question: string; answer: number }>
): Promise<void> {
  await updateDoc(doc(db, "tiebreakQuestions", id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTiebreakQuestion(id: string): Promise<void> {
  await deleteDoc(doc(db, "tiebreakQuestions", id));
}
