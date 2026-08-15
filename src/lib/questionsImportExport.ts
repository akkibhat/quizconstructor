import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { Question } from "@/lib/types/question";

/**
 * Turns a round's questions into a tab-separated file: one question per
 * line, "text<TAB>answer<TAB>points". Tabs (not the pipe the parser also
 * accepts - see parseQuestionsText) so the downloaded file opens cleanly
 * as columns in Excel/Sheets, matching how someone would naturally draft
 * questions before pasting them back in.
 */
export function exportQuestionsToTsv(questions: Question[]): string {
  return questions.map((question) => `${question.text}\t${question.answer}\t${question.points ?? 1}`).join("\n");
}

export interface ParsedQuestion {
  text: string;
  answer: string;
  points: number;
}

/**
 * Parses pasted or uploaded question text back into structured rows.
 * Splits each line on a tab if it has one (what you get pasting from a
 * spreadsheet), otherwise on a pipe `|` (easier to type by hand than a
 * literal tab, which a plain <textarea> usually treats as "move focus to
 * the next field" rather than inserting a character). Points is optional
 * and defaults to 1; blank lines and lines with no question text are
 * dropped rather than rejecting the whole paste over one bad line.
 */
export function parseQuestionsText(input: string): ParsedQuestion[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const fields = line.includes("\t") ? line.split("\t") : line.split("|");
      const text = (fields[0] ?? "").trim();
      const answer = (fields[1] ?? "").trim();
      const pointsField = fields[2]?.trim();
      const points = pointsField && !Number.isNaN(Number(pointsField)) ? Number(pointsField) : 1;
      return { text, answer, points };
    })
    .filter((question) => question.text.length > 0);
}

/** Appends parsed questions to the end of a round's existing question list, in one batch. */
export async function importQuestions(
  quizId: string,
  roundId: string,
  existingQuestions: Question[],
  parsed: ParsedQuestion[]
): Promise<void> {
  const batch = writeBatch(db);
  let order = existingQuestions.reduce((max, question) => Math.max(max, question.order), 0);

  for (const question of parsed) {
    order += 10;
    const ref = doc(collection(db, "quizzes", quizId, "rounds", roundId, "questions"));
    batch.set(ref, {
      order,
      text: question.text,
      answer: question.answer,
      points: question.points,
      imagePath: null,
      audioPath: null,
      audioPlayMode: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}
