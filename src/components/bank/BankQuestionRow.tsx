"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChipToggle } from "@/components/ui/ChipToggle";
import { fieldStyles, fieldStylesCompact, Label } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { ParsedListField } from "@/components/ui/ParsedListField";
import { cn } from "@/lib/cn";
import { deleteBankQuestion, updateBankQuestion } from "@/lib/questionBank";
import { ROUND_FLAVOUR_INFO, ROUND_FLAVOUR_LABELS } from "@/lib/roundFlavourLabels";
import type { BankQuestion } from "@/lib/types/bankQuestion";
import type { RoundFlavour } from "@/lib/types/round";

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
  const info = ROUND_FLAVOUR_INFO[question.flavour];

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
          list="bank-categories"
          defaultValue={question.categories.join(", ")}
          placeholder="Categories, comma separated"
          onBlur={(event) =>
            updateBankQuestion(question.id, {
              categories: event.target.value
                .split(",")
                .map((c) => c.trim())
                .filter((c) => c.length > 0),
            })
          }
          className={cn(fieldStylesCompact, "w-56")}
          aria-label="Categories"
        />
        <datalist id="bank-categories">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <select
          value={question.flavour}
          onChange={(event) => {
            const nextFlavour = event.target.value as RoundFlavour;
            const nextInfo = ROUND_FLAVOUR_INFO[nextFlavour];
            updateBankQuestion(question.id, {
              flavour: nextFlavour,
              // Switching away from a flavour that used options clears
              // them, since e.g. Multiple Choice options rarely make
              // sense once relabelled as a plain question.
              options: nextInfo.fields.options === "none" ? null : question.options,
            });
          }}
          className={cn(fieldStylesCompact, "w-40")}
          aria-label="Question type"
        >
          {(Object.keys(ROUND_FLAVOUR_LABELS) as RoundFlavour[]).map((f) => (
            <option key={f} value={f}>
              {ROUND_FLAVOUR_LABELS[f]}
            </option>
          ))}
        </select>
      </div>

      {info.fields.options === "true-false" ? (
        <div className="flex items-center gap-2">
          <Label className="shrink-0">Answer</Label>
          <ChipToggle
            selected={question.answer === "True"}
            onClick={() => updateBankQuestion(question.id, { answer: "True", options: ["True", "False"] })}
          >
            True
          </ChipToggle>
          <ChipToggle
            selected={question.answer === "False"}
            onClick={() => updateBankQuestion(question.id, { answer: "False", options: ["True", "False"] })}
          >
            False
          </ChipToggle>
        </div>
      ) : (
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
        </div>
      )}

      {info.fields.options === "list" && (
        <ParsedListField
          key={question.flavour}
          id={`bank-options-${question.id}`}
          label="Options"
          unitLabel="option"
          defaultValue={question.options}
          placeholder={"Trumpet\nTrombone\nClarinet\nTuba"}
          rows={3}
          onSave={(parsed) =>
            updateBankQuestion(question.id, { options: parsed.length > 0 ? parsed : null })
          }
          renderHint={(count) => {
            const min = info.fields.minOptions ?? 2;
            return count > 0 && count < min ? (
              <p className="text-xs text-flame">
                {count} option{count === 1 ? "" : "s"} set — add at least {min - count} more.
              </p>
            ) : null;
          }}
        />
      )}

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
