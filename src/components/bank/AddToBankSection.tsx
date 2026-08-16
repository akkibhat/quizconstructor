"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { fieldStyles, fieldStylesCompact, Label } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { addBankQuestion, importBankQuestions } from "@/lib/questionBank";
import { parseQuestionsText } from "@/lib/questionsImportExport";

/** Add one question, or paste a batch in the same format the round importer takes. */
export function AddToBankSection({ categories }: { categories: string[] }) {
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
