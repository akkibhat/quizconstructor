"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ChipToggle } from "@/components/ui/ChipToggle";
import { fieldStyles, fieldStylesCompact, Label } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { ParsedListField } from "@/components/ui/ParsedListField";
import { cn } from "@/lib/cn";
import { addBankQuestion, importBankQuestions } from "@/lib/questionBank";
import { parseQuestionsText } from "@/lib/questionsImportExport";
import { ROUND_FLAVOUR_INFO, ROUND_FLAVOUR_LABELS } from "@/lib/roundFlavourLabels";
import type { RoundFlavour } from "@/lib/types/round";

/** Add one question, or paste a batch in the same format the round importer takes. */
export function AddToBankSection({ categories }: { categories: string[] }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [flavour, setFlavour] = useState<RoundFlavour>("standard");
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [points, setPoints] = useState("1");
  const [options, setOptions] = useState<string[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const info = ROUND_FLAVOUR_INFO[flavour];
  const canAddOne = selectedCategories.length > 0 && text.trim() && answer.trim() && !isBusy;
  const canImport = selectedCategories.length > 0 && pasteText.trim() && !isBusy;

  async function handleAddOne() {
    setIsBusy(true);
    setMessage(null);
    try {
      await addBankQuestion(
        selectedCategories,
        flavour,
        text,
        answer,
        Number(points) || 1,
        options.length > 0 ? options : null
      );
      setText("");
      setAnswer("");
      setOptions([]);
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
      await importBankQuestions(selectedCategories, flavour, parsed);
      setPasteText("");
      setMessage(`Imported ${parsed.length} question${parsed.length === 1 ? "" : "s"}.`);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Panel className="mb-8 space-y-4">
      <div className="space-y-1.5">
        <ParsedListField
          id="bankCategories"
          label="Categories"
          unitLabel="category"
          defaultValue={selectedCategories}
          placeholder={"Geography\nNew Zealand\nFood & Drink"}
          rows={3}
          onSave={setSelectedCategories}
        />
        <p className="text-xs text-ink-muted">
          One per line{categories.length > 0 && ` - existing: ${categories.join(", ")}`}. A
          question can belong to several pools at once - e.g. a NZ wine fact can sit in New
          Zealand, Geography, AND Food &amp; Drink, and shows up when pulling from any of them.
        </p>
      </div>

      <div className="space-y-1.5 border-t border-edge pt-4">
        <Label htmlFor="bankFlavour">Question type</Label>
        <select
          id="bankFlavour"
          value={flavour}
          onChange={(event) => {
            setFlavour(event.target.value as RoundFlavour);
            setOptions([]);
          }}
          className={fieldStyles}
        >
          {(Object.keys(ROUND_FLAVOUR_LABELS) as RoundFlavour[]).map((f) => (
            <option key={f} value={f}>
              {ROUND_FLAVOUR_LABELS[f]}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-muted">
          A pool can mix types (Geography can hold both plain and True/False questions) - this is
          what lets a round only pull questions that actually fit it. Applies to everything added
          or imported below.
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

        {info.fields.options === "true-false" ? (
          <div className="flex items-center gap-2">
            <Label className="shrink-0">Answer</Label>
            <ChipToggle
              selected={answer === "True"}
              onClick={() => {
                setAnswer("True");
                setOptions(["True", "False"]);
              }}
            >
              True
            </ChipToggle>
            <ChipToggle
              selected={answer === "False"}
              onClick={() => {
                setAnswer("False");
                setOptions(["True", "False"]);
              }}
            >
              False
            </ChipToggle>
          </div>
        ) : (
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
          </div>
        )}

        {info.fields.options === "list" && (
          <ParsedListField
            key={flavour}
            id="bankOptions"
            label="Options"
            unitLabel="option"
            defaultValue={options}
            placeholder={"Trumpet\nTrombone\nClarinet\nTuba"}
            rows={3}
            onSave={setOptions}
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

        <div className="flex justify-end">
          <Button variant="primary" disabled={!canAddOne} onClick={handleAddOne}>
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
          pipe. All go into the categories and type above.
        </p>
        {info.fields.options !== "none" && (
          <p className="rounded-chip border border-flame/40 bg-flame/8 px-3 py-2 text-xs text-flame">
            This format has no column for options, so a batch lands without them - add options to
            each afterward on the bank page.
          </p>
        )}
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
