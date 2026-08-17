"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { fieldStylesCompact, Label } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { useBankQuestions } from "@/lib/hooks/useBankQuestions";
import { categoriesOf, insertBankQuestionsIntoRound, pickRandom, saveRoundQuestionsToBank } from "@/lib/questionBank";
import { ROUND_FLAVOUR_INFO, ROUND_FLAVOUR_LABELS } from "@/lib/roundFlavourLabels";
import type { BankQuestion } from "@/lib/types/bankQuestion";
import type { Question } from "@/lib/types/question";
import type { Round } from "@/lib/types/round";

export function BankSection({
  quizId,
  quizTitle,
  roundId,
  round,
  questions,
}: {
  quizId: string;
  quizTitle: string;
  roundId: string;
  round: Round;
  questions: Question[];
}) {
  const isMixed = round.flavour === "standard";
  const bank = useBankQuestions();
  const [category, setCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hideUsed, setHideUsed] = useState(true);
  const [saveCategories, setSaveCategories] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const categories = bank ? categoriesOf(bank) : [];
  // A category pool can mix flavours (e.g. Geography holding both plain
  // and True/False questions). A round locked to one flavour only ever
  // surfaces exact matches, same as before - but a "standard"/mixed round
  // can take any question-level flavour except Picture This, which only
  // makes sense as a whole dedicated round.
  function fitsRound(q: BankQuestion): boolean {
    return isMixed ? q.flavour !== "picture-this" : q.flavour === round.flavour;
  }
  const inCategory = bank?.filter((q) => q.categories.includes(category) && fitsRound(q)) ?? [];
  const visible = hideUsed ? inCategory.filter((q) => q.usageCount === 0) : inCategory;
  const selected = (bank ?? []).filter((q) => selectedIds.includes(q.id));
  // Which selected questions are missing options their own flavour needs
  // - checked per-question now rather than once for the whole round,
  // since a mixed round's selection can span several flavours at once.
  const missingOptions = selected.filter(
    (q) => ROUND_FLAVOUR_INFO[q.flavour].fields.options !== "none" && (!q.options || q.options.length === 0)
  );

  function toggle(questionId: string) {
    setSelectedIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId]
    );
  }

  async function handleInsert() {
    if (selected.length === 0) return;
    setIsBusy(true);
    setMessage(null);
    try {
      await insertBankQuestionsIntoRound(quizId, quizTitle, roundId, questions, selected);
      setMessage(`Added ${selected.length} question${selected.length === 1 ? "" : "s"}.`);
      setSelectedIds([]);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveToBank() {
    const parsed = saveCategories
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (parsed.length === 0) return;
    setIsBusy(true);
    setMessage(null);
    try {
      const saved = await saveRoundQuestionsToBank(parsed, round, questions);
      setMessage(
        saved === 0
          ? "Nothing to save - this round has no written questions yet."
          : `Saved ${saved} question${saved === 1 ? "" : "s"} to ${parsed.map((c) => `"${c}"`).join(", ")}.`
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Panel className="mb-6 space-y-4">
      <h3 className="font-display text-sm font-semibold tracking-widest text-ink uppercase">
        Question bank
      </h3>

      <div className="space-y-2">
        <Label htmlFor="bankPool">Pull from a pool</Label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="bankPool"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setSelectedIds([]);
            }}
            className={cn(fieldStylesCompact, "min-w-[12rem] flex-1")}
          >
            <option value="">Choose a category…</option>
            {categories.map((name) => {
              const unused = bank?.filter(
                (q) => q.categories.includes(name) && fitsRound(q) && q.usageCount === 0
              ).length;
              return (
                <option key={name} value={name}>
                  {name} ({unused} unused)
                </option>
              );
            })}
          </select>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-muted">
            <input
              type="checkbox"
              checked={hideUsed}
              onChange={(event) => setHideUsed(event.target.checked)}
              className="accent-flame"
            />
            Hide previously used
          </label>
        </div>

        {category && visible.length === 0 && (
          <p className="text-xs text-ink-muted">
            {inCategory.length === 0
              ? isMixed
                ? "No questions fit this category yet (Picture This questions can't be pulled into a standard round) - add some on the bank page."
                : `No ${ROUND_FLAVOUR_LABELS[round.flavour]} questions in this category yet - add some on the bank page, tagged with this flavour.`
              : hideUsed
                ? "Every matching question in this pool has been used - untick above to reuse one, or add more on the bank page."
                : "This pool is empty."}
          </p>
        )}

        {visible.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {[5, 8, 10].map((count) => (
                <Button
                  key={count}
                  size="sm"
                  disabled={visible.length === 0}
                  onClick={() => setSelectedIds(pickRandom(visible, count).map((q) => q.id))}
                >
                  Random {count}
                </Button>
              ))}
              <Button size="sm" onClick={() => setSelectedIds([])}>
                Clear
              </Button>
            </div>

            <ul className="max-h-72 space-y-1.5 overflow-y-auto rounded-chip border border-edge p-2">
              {visible.map((question) => {
                const isSelected = selectedIds.includes(question.id);
                return (
                  <li key={question.id}>
                    <button
                      type="button"
                      onClick={() => toggle(question.id)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-chip border p-2 text-left text-sm transition-colors",
                        isSelected
                          ? "border-flame bg-flame/15 text-ink"
                          : "border-transparent text-ink-soft hover:border-edge-strong"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border text-[10px]",
                          isSelected ? "border-flame bg-flame text-on-flame" : "border-edge-strong"
                        )}
                        aria-hidden="true"
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                      <span className="min-w-0">
                        <span className="block">{question.text}</span>
                        <span className="block text-xs text-ink-muted">
                          {question.answer} · {question.points} pt
                          {question.points === 1 ? "" : "s"}
                          {question.usageCount > 0 && " · previously used"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {missingOptions.length > 0 && (
              <p className="rounded-chip border border-flame/40 bg-flame/8 px-3 py-2 text-xs text-flame">
                {missingOptions.length} selected question{missingOptions.length === 1 ? "" : "s"}{" "}
                {missingOptions.length === 1 ? "has" : "have"} no options saved - those will land
                as plain open questions. Add options to each afterward in the list below.
              </p>
            )}

            <Button
              variant="primary"
              disabled={selected.length === 0 || isBusy}
              onClick={handleInsert}
            >
              {isBusy
                ? "Adding…"
                : `Add ${selected.length || ""} selected to this round`.replace("  ", " ")}
            </Button>
          </>
        )}
      </div>

      <div className="space-y-2 border-t border-edge pt-4">
        <Label htmlFor="saveCategory">Save this round&apos;s questions to a pool</Label>
        <p className="text-xs text-ink-muted">
          {isMixed
            ? "Each question is tagged with its own type (Standard, True or False, etc), matching what it's set to below."
            : `Tagged as ${ROUND_FLAVOUR_LABELS[round.flavour]}, matching this round.`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="saveCategory"
            list="round-bank-categories"
            value={saveCategories}
            onChange={(event) => setSaveCategories(event.target.value)}
            placeholder="Category names, comma separated"
            className={cn(fieldStylesCompact, "min-w-[10rem] flex-1")}
          />
          <datalist id="round-bank-categories">
            {categories.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <Button disabled={!saveCategories.trim() || isBusy} onClick={handleSaveToBank}>
            Save to bank
          </Button>
        </div>
      </div>

      {message && <p className="text-xs text-mint">{message}</p>}
    </Panel>
  );
}
