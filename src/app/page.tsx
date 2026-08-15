"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, PageHeader, QuizCode, SectionHeading } from "@/components/ui/AppShell";
import { Button, buttonStyles } from "@/components/ui/Button";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog";
import { useQuizzes } from "@/lib/hooks/useQuizzes";
import { archiveQuiz, duplicateQuiz } from "@/lib/quizzes";
import type { Quiz } from "@/lib/types/quiz";

// The live, code-gated views for a quiz, with host-friendly labels
// (rather than the internal route names) - this is the "what pages are
// available" quick-access row for each quiz on the dashboard. "Run Quiz"
// is marked primary because it's the one you reach for on the night.
function liveLinksFor(code: string) {
  return [
    { label: "Run Quiz", href: `/control/${code}`, primary: true },
    { label: "Projector", href: `/display/${code}`, primary: false },
    { label: "Scoring", href: `/scoring/${code}`, primary: false },
    { label: "Teams", href: `/team-setup/${code}`, primary: false },
    { label: "Leaderboard", href: `/leaderboard/${code}`, primary: false },
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
    <Panel as="li" className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <Link
          href={`/admin/quizzes/${quiz.id}`}
          className="font-display min-w-0 text-xl font-semibold text-ink transition-colors hover:text-flame"
        >
          {quiz.title}
        </Link>
        <QuizCode code={quiz.code} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {liveLinksFor(quiz.code).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={buttonStyles(link.primary ? "primary" : "secondary", "sm")}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-edge pt-3">
        <Link href={`/admin/quizzes/${quiz.id}`} className={buttonStyles("ghost", "sm")}>
          Edit
        </Link>
        <Button variant="ghost" size="sm" disabled={isDuplicating} onClick={handleDuplicate}>
          {isDuplicating ? "Duplicating…" : "Duplicate"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-danger hover:text-danger"
          onClick={async () => {
            if (await confirmDialog(`Delete "${quiz.title}"?`)) {
              archiveQuiz(quiz.id);
            }
          }}
        >
          Delete
        </Button>
      </div>
    </Panel>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const quizzes = useQuizzes(user?.uid);
  const { confirmDialog, dialog } = useConfirmDialog();

  return (
    <AppShell
      actions={
        <>
          <Link href="/admin/settings" className={buttonStyles("ghost", "sm")}>
            Settings
          </Link>
          <Button variant="secondary" size="sm" onClick={() => signOut(auth)}>
            Sign Out
          </Button>
        </>
      }
    >
      <PageHeader
        eyebrow="Quiz night"
        title="Your quizzes"
        description="Pick a quiz to edit its rounds, or jump straight to a live view for the night."
      />

      <SectionHeading
        actions={
          <Link href="/admin/quizzes/new" className={buttonStyles("primary", "md")}>
            New Quiz
          </Link>
        }
      >
        All quizzes
      </SectionHeading>

      {quizzes === undefined && <p className="text-sm text-ink-muted">Loading…</p>}
      {quizzes?.length === 0 && (
        <EmptyState>No quizzes yet — create your first one to get started.</EmptyState>
      )}

      <ul className="space-y-3">
        {quizzes?.map((quiz) => (
          <QuizRow key={quiz.id} quiz={quiz} confirmDialog={confirmDialog} />
        ))}
      </ul>

      {dialog}
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
