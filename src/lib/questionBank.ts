import {
  collection,
  deleteDoc,
  doc,
  increment,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { ParsedQuestion } from "@/lib/questionsImportExport";
import type { BankQuestion } from "@/lib/types/bankQuestion";
import { newQuestionFields, type Question } from "@/lib/types/question";
import type { RoundFlavour } from "@/lib/types/round";

function bankCollection() {
  return collection(db, "questionBank");
}

/** Adds a single question to a category pool, tagged with the flavour it's meant for. */
export async function addBankQuestion(
  category: string,
  flavour: RoundFlavour,
  text: string,
  answer: string,
  points: number,
  options: string[] | null = null
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(bankCollection()), {
    category: category.trim(),
    flavour,
    text: text.trim(),
    answer: answer.trim(),
    points,
    options,
    usageCount: 0,
    lastUsedAt: null,
    lastUsedQuizId: null,
    lastUsedQuizTitle: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function updateBankQuestion(
  questionId: string,
  updates: Partial<Pick<BankQuestion, "category" | "flavour" | "text" | "answer" | "points" | "options">>
): Promise<void> {
  await updateDoc(doc(bankCollection(), questionId), { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteBankQuestion(questionId: string): Promise<void> {
  await deleteDoc(doc(bankCollection(), questionId));
}

/**
 * Bulk-adds parsed questions to a category, reusing the same
 * `Question | Answer | Points` format the per-round importer already
 * accepts (see lib/questionsImportExport.ts) - so a spreadsheet of
 * material can be dropped straight into a pool. The format has no column
 * for options, so a batch always lands with options: null - same gap as
 * the per-round TSV importer.
 */
export async function importBankQuestions(
  category: string,
  flavour: RoundFlavour,
  parsed: ParsedQuestion[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const question of parsed) {
    batch.set(doc(bankCollection()), {
      category: category.trim(),
      flavour,
      text: question.text,
      answer: question.answer,
      points: question.points,
      options: null,
      usageCount: 0,
      lastUsedAt: null,
      lastUsedQuizId: null,
      lastUsedQuizTitle: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

/**
 * Copies bank questions into a quiz round and records that they've been
 * used, in one batch so the two can't drift apart.
 *
 * The round gets its own independent copies - editing a question inside
 * a quiz never reaches back into the bank, matching how duplicateQuiz
 * treats cloned content. That's deliberate: a tweak made mid-build for
 * one night's crowd shouldn't silently rewrite your master copy.
 */
export async function insertBankQuestionsIntoRound(
  quizId: string,
  quizTitle: string,
  roundId: string,
  existingQuestions: Question[],
  bankQuestions: BankQuestion[]
): Promise<void> {
  const batch = writeBatch(db);
  let order = existingQuestions.reduce((max, question) => Math.max(max, question.order), 0);

  for (const bankQuestion of bankQuestions) {
    order += 10;
    batch.set(
      doc(collection(db, "quizzes", quizId, "rounds", roundId, "questions")),
      newQuestionFields({
        order,
        text: bankQuestion.text,
        answer: bankQuestion.answer,
        points: bankQuestion.points,
        options: bankQuestion.options,
      })
    );

    batch.update(doc(bankCollection(), bankQuestion.id), {
      usageCount: increment(1),
      lastUsedAt: serverTimestamp(),
      lastUsedQuizId: quizId,
      lastUsedQuizTitle: quizTitle,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

/**
 * Pushes a round's questions up into a category pool - the reverse
 * direction, for when a round was written from scratch and is worth
 * keeping. Tagged with the round's own flavour, since every question in
 * a round already shares one. Questions with no text are skipped, since a
 * half-filled row in the editor isn't worth banking.
 *
 * The copies start with a clean usage record rather than inheriting one:
 * they're new bank entries, and the quiz they came from is already built.
 */
export async function saveRoundQuestionsToBank(
  category: string,
  flavour: RoundFlavour,
  questions: Question[]
): Promise<number> {
  const worthKeeping = questions.filter((question) => question.text.trim().length > 0);
  if (worthKeeping.length === 0) {
    return 0;
  }

  const batch = writeBatch(db);
  for (const question of worthKeeping) {
    batch.set(doc(bankCollection()), {
      category: category.trim(),
      flavour,
      text: question.text,
      answer: question.answer,
      points: question.points ?? 1,
      options: question.options,
      usageCount: 0,
      lastUsedAt: null,
      lastUsedQuizId: null,
      lastUsedQuizTitle: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return worthKeeping.length;
}

/** The distinct category names currently in the bank, alphabetically. */
export function categoriesOf(questions: BankQuestion[]): string[] {
  return [...new Set(questions.map((question) => question.category))].sort((a, b) =>
    a.localeCompare(b)
  );
}

/**
 * Picks `count` questions at random from those given, without repeats.
 * Used by the "pull N random" shortcut in the round editor - shuffles a
 * copy rather than the caller's array, and quietly returns fewer than
 * asked for if the pool is running low.
 */
export function pickRandom(questions: BankQuestion[], count: number): BankQuestion[] {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
