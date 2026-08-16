"use client";

import { useState } from "react";

import { AddToBankSection } from "@/components/bank/AddToBankSection";
import { BankQuestionRow } from "@/components/bank/BankQuestionRow";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, BackLink, PageHeader, SectionHeading } from "@/components/ui/AppShell";
import { fieldStyles } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { useBankQuestions } from "@/lib/hooks/useBankQuestions";
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog";
import { categoriesOf } from "@/lib/questionBank";
import { ROUND_FLAVOUR_LABELS } from "@/lib/roundFlavourLabels";

function BankContent() {
  const questions = useBankQuestions();
  const { confirmDialog, dialog } = useConfirmDialog();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const categories = questions ? categoriesOf(questions) : [];
  const normalisedSearch = search.trim().toLowerCase();
  const searchResults = normalisedSearch
    ? (questions ?? []).filter(
        (q) =>
          q.text.toLowerCase().includes(normalisedSearch) ||
          q.answer.toLowerCase().includes(normalisedSearch)
      )
    : null;

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

      {questions !== undefined && questions.length > 0 && (
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search question or answer text, across every category…"
          className={cn(fieldStyles, "mb-4")}
        />
      )}

      {searchResults && (
        <div className="mb-3 space-y-2">
          {searchResults.length === 0 ? (
            <EmptyState>No questions match &quot;{search.trim()}&quot;.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {searchResults.map((question) => (
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
      )}

      {!searchResults && (
        <div className="space-y-3">
          {categories.map((category) => {
            const inCategory = questions?.filter((q) => q.category === category) ?? [];
            const unused = inCategory.filter((q) => q.usageCount === 0).length;
            const isOpen = openCategory === category;
            // What mix of question types this pool holds - e.g. "12 True or
            // False, 8 Question" - so it's clear at a glance whether a
            // category actually has the type a round needs before opening it.
            const flavourCounts = [...new Set(inCategory.map((q) => q.flavour))]
              .map((f) => `${inCategory.filter((q) => q.flavour === f).length} ${ROUND_FLAVOUR_LABELS[f]}`)
              .join(", ");

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
                  <span className="min-w-0">
                    <span className="font-display block font-semibold text-ink">{category}</span>
                    <span className="block truncate text-xs text-ink-muted">{flavourCounts}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs text-ink-muted">
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
      )}

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
