"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldStyles, fieldStylesCompact } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { deleteBankQuestion, updateBankQuestion } from "@/lib/questionBank";
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

export function BankQuestionRow({
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
