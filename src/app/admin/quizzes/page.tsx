"use client";

import Link from "next/link";

import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/hooks/useAuth";
import { useQuizzes } from "@/lib/hooks/useQuizzes";
import { archiveQuiz } from "@/lib/quizzes";

function QuizzesList() {
  const { user } = useAuth();
  const quizzes = useQuizzes(user?.uid);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-100">My Quizzes</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/settings"
            className="rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300"
          >
            Settings
          </Link>
          <Link
            href="/admin/quizzes/new"
            className="rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900"
          >
            New Quiz
          </Link>
        </div>
      </div>

      {quizzes === undefined && <p className="text-neutral-400">Loading…</p>}

      {quizzes?.length === 0 && (
        <p className="text-neutral-400">
          No quizzes yet — create your first one to get started.
        </p>
      )}

      <ul className="space-y-2">
        {quizzes?.map((quiz) => (
          <li
            key={quiz.id}
            className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-900 px-4 py-3 hover:border-neutral-700"
          >
            <Link href={`/admin/quizzes/${quiz.id}`} className="flex-1 text-neutral-100">
              {quiz.title}
            </Link>
            <span className="mr-4 font-mono text-sm text-neutral-500">{quiz.code}</span>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete "${quiz.title}"?`)) {
                  archiveQuiz(quiz.id);
                }
              }}
              className="rounded border border-red-900 px-2 py-1 text-xs text-red-400"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function QuizzesPage() {
  return (
    <RequireAuth>
      <QuizzesList />
    </RequireAuth>
  );
}
