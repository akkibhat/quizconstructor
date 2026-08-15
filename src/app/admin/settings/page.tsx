"use client";

import Link from "next/link";
import { useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { useTiebreakQuestions } from "@/lib/hooks/useTiebreakQuestions";
import {
  addTiebreakQuestion,
  deleteTiebreakQuestion,
  updateTiebreakQuestion,
} from "@/lib/tiebreakQuestions";
import type { TiebreakQuestion } from "@/lib/types/tiebreakQuestion";

function TiebreakQuestionRow({ item }: { item: TiebreakQuestion }) {
  return (
    <li className="space-y-2 rounded border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <textarea
          defaultValue={item.question}
          onBlur={(event) => updateTiebreakQuestion(item.id, { question: event.target.value })}
          className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
          rows={2}
        />
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this tiebreak question?")) deleteTiebreakQuestion(item.id);
          }}
          className="rounded border border-red-900 px-2 py-1 text-xs text-red-400"
        >
          Delete
        </button>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-neutral-400">Answer:</label>
        <input
          type="number"
          defaultValue={item.answer}
          onBlur={(event) =>
            updateTiebreakQuestion(item.id, { answer: Number(event.target.value) || 0 })
          }
          className="w-40 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
        />
      </div>
    </li>
  );
}

function AddTiebreakQuestionForm() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim() || answer.trim() === "") return;
    setIsSubmitting(true);
    try {
      await addTiebreakQuestion(question.trim(), Number(answer));
      setQuestion("");
      setAnswer("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded border border-neutral-800 bg-neutral-900 p-4"
    >
      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="e.g. What's the circumference of the globe in km?"
        className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
        rows={2}
      />
      <div className="flex items-center gap-2">
        <label htmlFor="answer" className="text-sm text-neutral-400">
          Answer:
        </label>
        <input
          id="answer"
          type="number"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          className="w-40 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
      >
        Add Tiebreak Question
      </button>
    </form>
  );
}

function SettingsContent() {
  const questions = useTiebreakQuestions();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/admin/quizzes"
        className="mb-4 inline-block text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to my quizzes
      </Link>

      <h1 className="mb-2 text-2xl font-semibold text-neutral-100">Settings</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Shared across every quiz, not tied to one specific night.
      </p>

      <h2 className="mb-3 text-lg font-medium text-neutral-100">Tiebreak Questions</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Numeric-answer questions - closest guess wins. Pulled in whenever a tie needs resolving
        (1st/2nd/3rd or the 2nd-to-last prize) from the Controller.
      </p>

      <AddTiebreakQuestionForm />

      {questions === undefined && <p className="text-neutral-400">Loading…</p>}
      {questions?.length === 0 && <p className="text-neutral-500">No tiebreak questions yet.</p>}

      <ul className="space-y-2">
        {questions?.map((item) => (
          <TiebreakQuestionRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  );
}
