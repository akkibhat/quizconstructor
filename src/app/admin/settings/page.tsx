"use client";

import { useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, BackLink, PageHeader, SectionHeading } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/Button";
import { fieldStyles, fieldStylesCompact, Label } from "@/components/ui/Field";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog";
import { useTiebreakQuestions } from "@/lib/hooks/useTiebreakQuestions";
import {
  addTiebreakQuestion,
  deleteTiebreakQuestion,
  updateTiebreakQuestion,
} from "@/lib/tiebreakQuestions";
import type { TiebreakQuestion } from "@/lib/types/tiebreakQuestion";

function TiebreakQuestionRow({
  item,
  confirmDialog,
}: {
  item: TiebreakQuestion;
  confirmDialog: (message: string) => Promise<boolean>;
}) {
  return (
    <Panel as="li" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <textarea
          defaultValue={item.question}
          onBlur={(event) => updateTiebreakQuestion(item.id, { question: event.target.value })}
          className={cn(fieldStyles, "flex-1")}
          rows={2}
        />
        <Button
          variant="danger"
          size="sm"
          onClick={async () => {
            if (await confirmDialog("Delete this tiebreak question?")) {
              deleteTiebreakQuestion(item.id);
            }
          }}
        >
          Delete
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-ink-muted">Answer:</span>
        <input
          type="number"
          defaultValue={item.answer}
          onBlur={(event) =>
            updateTiebreakQuestion(item.id, { answer: Number(event.target.value) || 0 })
          }
          className={cn(fieldStylesCompact, "w-40 tabular-nums")}
        />
      </div>
    </Panel>
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
      className="mb-6 space-y-3 rounded-panel border border-edge bg-surface p-4"
    >
      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="e.g. What's the circumference of the globe in km?"
        className={fieldStyles}
        rows={2}
      />
      <div className="flex items-center gap-2">
        <Label htmlFor="answer" className="shrink-0">
          Answer:
        </Label>
        <input
          id="answer"
          type="number"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          className={cn(fieldStylesCompact, "w-40 tabular-nums")}
        />
      </div>
      <Button type="submit" variant="primary" disabled={isSubmitting}>
        Add Tiebreak Question
      </Button>
    </form>
  );
}

function SettingsContent() {
  const questions = useTiebreakQuestions();
  const { confirmDialog, dialog } = useConfirmDialog();

  return (
    <AppShell>
      <BackLink href="/">Back to dashboard</BackLink>

      <PageHeader
        eyebrow="Global"
        title="Settings"
        description="Shared across every quiz, not tied to one specific night."
      />

      <SectionHeading>Tiebreak Questions</SectionHeading>
      <p className="mb-4 text-sm text-ink-muted">
        Numeric-answer questions - closest guess wins. Pulled in whenever a tie needs resolving
        (1st/2nd/3rd or the 2nd-to-last prize) from the Controller.
      </p>

      <AddTiebreakQuestionForm />

      {questions === undefined && <p className="text-sm text-ink-muted">Loading…</p>}
      {questions?.length === 0 && (
        <EmptyState>No tiebreak questions yet — add one above.</EmptyState>
      )}

      <ul className="space-y-2">
        {questions?.map((item) => (
          <TiebreakQuestionRow key={item.id} item={item} confirmDialog={confirmDialog} />
        ))}
      </ul>

      {dialog}
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  );
}
