import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "@/lib/firebase/client";

function extensionOf(file: File): string {
  const fromName = file.name.split(".").pop();
  return fromName && fromName.length <= 5 ? fromName : "bin";
}

/**
 * Uploads a question's image or audio file to Storage and returns the
 * *path* (not a download URL) to store on the question document. Callers
 * resolve the actual URL with resolveMediaUrl() at render time, so access
 * always goes back through Storage security rules rather than a
 * once-issued token embedded in a stored URL.
 */
export async function uploadQuestionImage(quizId: string, questionId: string, file: File): Promise<string> {
  const path = `quizzes/${quizId}/questions/${questionId}/image.${extensionOf(file)}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return path;
}

export async function uploadQuestionAudio(quizId: string, questionId: string, file: File): Promise<string> {
  const path = `quizzes/${quizId}/questions/${questionId}/audio.${extensionOf(file)}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return path;
}

export async function uploadLongGameClueImage(quizId: string, roundId: string, file: File): Promise<string> {
  const path = `quizzes/${quizId}/rounds/${roundId}/longgame-image.${extensionOf(file)}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return path;
}

/** Deletes a previously-uploaded file, e.g. when a question's image is replaced or removed. */
export async function deleteMediaAtPath(path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}

/** Resolves a stored Storage path into an actual, fetchable download URL. */
export async function resolveMediaUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}
