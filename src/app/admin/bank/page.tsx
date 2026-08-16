"use client";

import { useState } from "react";

import { AddToBankSection } from "@/components/bank/AddToBankSection";
import { BankQuestionRow } from "@/components/bank/BankQuestionRow";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, BackLink, PageHeader, SectionHeading } from "@/components/ui/AppShell";
import { EmptyState } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { useBankQuestions } from "@/lib/hooks/useBankQuestions";
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog";
import { categoriesOf } from "@/lib/questionBank";

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
