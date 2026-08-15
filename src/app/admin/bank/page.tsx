"use client";

import { useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, BackLink, PageHeader, SectionHeading } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldStyles, fieldStylesCompact, Label } from "@/components/ui/Field";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { useBankQuestions } from "@/lib/hooks/useBankQuestions";
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog";
import {
  addBankQuestion,
  categoriesOf,
  deleteBankQuestion,
  importBankQuestions,
  updateBankQuestion,
} from "@/lib/questionBank";
import { parseQuestionsText } from "@/lib/questionsImportExport";
import type { BankQuestion } from "@/lib/types/bankQuestion";

/** "14 Aug 2026" - short enough to sit inline next to a question. */
function formatUsedDate(question: BankQuestion): string | null {
  if (!question.lastUsedAt) return null;
  return question.lastUsedAt.toDate().toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BankQuestionRow({
  question,
  categories,
  confirmDialog,
}: {
  question: BankQuestion;
  categories: string[];
  confirmDialog: (message: string) => Promise<boolean>;
}) {
  const usedOn = formatUsedDate(question);

  return (
    <Panel as="li" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <textarea
          defaultValue={question.text}
          placeholder="Question"
          onBlur={(event) => updateBankQuestion(question.id, { text: event.target.value })}
          className={cn(fieldStyles, "flex-1")}
          rows={2}
        />
        <Button
          variant="danger"
          size="sm"
          onClick={async () => {
            if (await confirmDialog("Delete this question from the bank?")) {
              deleteBankQuestion(question.id);
            }
          }}
        >
          Delete
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          defaultValue={question.answer}
          placeholder="Answer"
          onBlur={(event) => updateBankQuestion(question.id, { answer: event.target.value })}
          className={cn(fieldStylesCompact, "min-w-[10rem] flex-1")}
        />
        <input
          type="number"
          step={0.5}
          min={0}
          defaultValue={question.points}
          onBlur={(event) =>
            updateBankQuestion(question.id, { points: Number(event.target.value) || 0 })
          }
          className={cn(fieldStylesCompact, "w-16 tabular-nums")}
          aria-label="Points"
        />
        <span className="text-xs text-ink-muted">pts</span>
        <input
          list="bank-categories"
          defaultValue={question.category}
          onBlur={(event) => updateBankQuestion(question.id, { category: event.target.value })}
          className={cn(fieldStylesCompact, "w-40")}
          aria-label="Category"
        />
        <datalist id="bank-categories">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </div>

      {usedOn && (
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <Badge tone="gold">Used</Badge>
          {question.lastUsedQuizTitle ?? "a quiz"} · {usedOn}
          {question.usageCount > 1 && ` · ${question.usageCount} times`}
        </p>
      )}
    </Panel>
  );
}

/** Add one question, or paste a batch in the same format the round importer takes. */
function AddToBankSection({ categories }: { categories: string[] }) {
  const [category, setCategory] = useState("");
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [points, setPoints] = useState("1");
  const [pasteText, setPasteText] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canAddOne = category.trim() && text.trim() && answer.trim() && !isBusy;
  const canImport = category.trim() && pasteText.trim() && !isBusy;

  async function handleAddOne() {
    setIsBusy(true);
    setMessage(null);
    try {
      await addBankQuestion(category, text, answer, Number(points) || 1);
      setText("");
      setAnswer("");
      setMessage("Added.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleImport() {
    const parsed = parseQuestionsText(pasteText);
    if (parsed.length === 0) {
      setMessage("No valid questions found - check the format.");
      return;
    }
    setIsBusy(true);
    setMessage(null);
    try {
      await importBankQuestions(category, parsed);
      setPasteText("");
      setMessage(`Imported ${parsed.length} question${parsed.length === 1 ? "" : "s"}.`);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Panel className="mb-8 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="bankCategory">Category</Label>
        <input
          id="bankCategory"
          list="bank-categories-add"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="e.g. Geography, Music: 90s, Film & TV"
          className={fieldStyles}
        />
        <datalist id="bank-categories-add">
          {categories.map((existing) => (
            <option key={existing} value={existing} />
          ))}
        </datalist>
        <p className="text-xs text-ink-muted">
          Type a new name to start a pool, or pick an existing one to add to it.
        </p>
      </div>

      <div className="space-y-2 border-t border-edge pt-4">
        <Label>Add one question</Label>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Question"
          className={fieldStyles}
          rows={2}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Answer"
            className={cn(fieldStylesCompact, "min-w-[10rem] flex-1")}
          />
          <input
            type="number"
            step={0.5}
            min={0}
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            className={cn(fieldStylesCompact, "w-16 tabular-nums")}
            aria-label="Points"
          />
          <span className="text-xs text-ink-muted">pts</span>
          <Button variant="primary" disabled={!canAddOne} onClick={handleAddOne} className="ml-auto">
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t border-edge pt-4">
        <Label>Or paste a batch</Label>
        <p className="text-xs leading-relaxed text-ink-muted">
          One per line: Question, Answer, Points (optional, defaults to 1) — separated by a Tab
          (paste from a spreadsheet) or a{" "}
          <code className="rounded-chip bg-backdrop px-1 py-0.5 font-mono text-ink-soft">|</code>{" "}
          pipe. All go into the category above.
        </p>
        <textarea
          value={pasteText}
          onChange={(event) => setPasteText(event.target.value)}
          placeholder={"Capital of France|Paris|1\nCapital of Japan|Tokyo"}
          rows={4}
          className={cn(fieldStyles, "font-mono text-xs")}
        />
        <Button variant="primary" disabled={!canImport} onClick={handleImport}>
          {isBusy ? "Importing…" : "Import batch"}
        </Button>
      </div>

      {message && <p className="text-xs text-mint">{message}</p>}
    </Panel>
  );
}

function BankContent() {
  const questions = useBankQuestions();
  const { confirmDialog, dialog } = useConfirmDialog();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const categories = questions ? categoriesOf(questions) : [];

  return (
    <AppShell>
      <BackLink href="/">Back to dashboard</BackLink>

      <PageHeader
        eyebrow="Global"
        title="Question bank"
        description="Categorised pools of questions that quiz rounds draw from. Shared across every quiz - add to a pool over time, then pull a handful into a round when you're building a night."
      />

      <AddToBankSection categories={categories} />

      <SectionHeading>Pools</SectionHeading>

      {questions === undefined && <p className="text-sm text-ink-muted">Loading…</p>}

      {questions?.length === 0 && (
        <EmptyState>Nothing banked yet — add your first questions above.</EmptyState>
      )}

      <div className="space-y-3">
        {categories.map((category) => {
          const inCategory = questions?.filter((q) => q.category === category) ?? [];
          const unused = inCategory.filter((q) => q.usageCount === 0).length;
          const isOpen = openCategory === category;

          return (
            <div key={category}>
              <button
                type="button"
                onClick={() => setOpenCategory(isOpen ? null : category)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-panel border px-4 py-3 text-left transition-colors",
                  isOpen
                    ? "border-flame/60 bg-surface"
                    : "border-edge bg-surface hover:border-flame/40"
                )}
              >
                <span className="font-display font-semibold text-ink">{category}</span>
                <span className="flex items-center gap-3 text-xs text-ink-muted">
                  <span className="tabular-nums">
                    {inCategory.length} question{inCategory.length === 1 ? "" : "s"}
                  </span>
                  <span className="tabular-nums text-mint">{unused} unused</span>
                  <span aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
                </span>
              </button>

              {isOpen && (
                <ul className="mt-2 space-y-2 pl-3">
                  {inCategory.map((question) => (
                    <BankQuestionRow
                      key={question.id}
                      question={question}
                      categories={categories}
                      confirmDialog={confirmDialog}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {dialog}
    </AppShell>
  );
}

export default function BankPage() {
  return (
    <RequireAuth>
      <BankContent />
    </RequireAuth>
  );
}
