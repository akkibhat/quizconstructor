"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog";
import { useQuizzes } from "@/lib/hooks/useQuizzes";
import { archiveQuiz, duplicateQuiz } from "@/lib/quizzes";
import type { Quiz } from "@/lib/types/quiz";

// The live, code-gated views for a quiz, with host-friendly labels
// (rather than the internal route names) - this is the "what pages are
// available" quick-access row for each quiz on the dashboard.
function liveLinksFor(code: string) {
  return [
    { label: "Team Setup", href: `/team-setup/${code}` },
    { label: "Run Quiz", href: `/control/${code}` },
    { label: "Projector", href: `/display/${code}` },
    { label: "Scoring", href: `/scoring/${code}` },
    { label: "Leaderboard", href: `/leaderboard/${code}` },
  ];
}

function QuizRow({
  quiz,
  confirmDialog,
}: {
  quiz: Quiz;
  confirmDialog: (message: string) => Promise<boolean>;
}) {
  const [isDuplicating, setIsDuplicating] = useState(false);

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      await duplicateQuiz(quiz.id, quiz.hostUid);
    } finally {
      setIsDuplicating(false);
    }
  }

  return (
    <li className="rounded border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <Link href={`/admin/quizzes/${quiz.id}`} className="text-lg text-neutral-100 hover:underline">
          {quiz.title}
        </Link>
        <span className="font-mono text-sm text-neutral-500">{quiz.code}</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {liveLinksFor(quiz.code).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:border-neutral-500"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/admin/quizzes/${quiz.id}`}
          className="rounded border border-neutral-700 px-2.5 py-1 text-xs text-neutral-400"
        >
          Edit
        </Link>
        <button
          type="button"
          disabled={isDuplicating}
          onClick={handleDuplicate}
          className="rounded border border-neutral-700 px-2.5 py-1 text-xs text-neutral-400 disabled:opacity-50"
        >
          {isDuplicating ? "Duplicating…" : "Duplicate"}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (await confirmDialog(`Delete "${quiz.title}"?`)) {
              archiveQuiz(quiz.id);
            }
          }}
          className="rounded border border-red-900 px-2.5 py-1 text-xs text-red-400"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const quizzes = useQuizzes(user?.uid);
  const { confirmDialog, dialog } = useConfirmDialog();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-100">QuizConstructor</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/settings"
            className="rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-medium text-neutral-100">My Quizzes</h2>
        <Link
          href="/admin/quizzes/new"
          className="rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900"
        >
          New Quiz
        </Link>
      </div>

      {quizzes === undefined && <p className="text-neutral-400">Loading…</p>}
      {quizzes?.length === 0 && (
        <p className="text-neutral-400">No quizzes yet — create your first one to get started.</p>
      )}

      <ul className="space-y-3">
        {quizzes?.map((quiz) => (
          <QuizRow key={quiz.id} quiz={quiz} confirmDialog={confirmDialog} />
        ))}
      </ul>

      {dialog}
    </div>
  );
}

export default function HomePage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
