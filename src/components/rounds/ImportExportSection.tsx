"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { fieldStyles } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { exportQuestionsToTsv, importQuestions, parseQuestionsText } from "@/lib/questionsImportExport";
import type { Question } from "@/lib/types/question";

export function ImportExportSection({
  quizId,
  roundId,
  roundTitle,
  questions,
}: {
  quizId: string;
  roundId: string;
  roundTitle: string;
  questions: Question[];
}) {
  const [pasteText, setPasteText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleExport() {
    const tsv = exportQuestionsToTsv(questions);
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${roundTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-questions.tsv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPasteText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function handleImport() {
    const parsed = parseQuestionsText(pasteText);
    if (parsed.length === 0) {
      setMessage("No valid questions found - check the format below.");
      return;
    }
    setIsImporting(true);
    setMessage(null);
    try {
      await importQuestions(quizId, roundId, questions, parsed);
      setPasteText("");
      setMessage(`Imported ${parsed.length} question${parsed.length === 1 ? "" : "s"}.`);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Panel className="mb-8">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold tracking-widest text-ink uppercase">
          Import / Export
        </h3>
        <Button size="sm" disabled={questions.length === 0} onClick={handleExport}>
          Export as file
        </Button>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-ink-muted">
        One question per line: Question, Answer, Points (optional, defaults to 1) - separated by
        a Tab (paste straight from a spreadsheet) or a{" "}
        <code className="rounded-chip bg-backdrop px-1 py-0.5 font-mono text-ink-soft">|</code>{" "}
        pipe (if typing by hand). Always adds to this round&apos;s existing questions, never
        replaces them.
      </p>
      <textarea
        value={pasteText}
        onChange={(event) => setPasteText(event.target.value)}
        placeholder={"Capital of France|Paris|1\nCapital of Japan|Tokyo"}
        rows={4}
        className={cn(fieldStyles, "mb-3 font-mono text-xs")}
      />
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".tsv,.txt,.csv"
          onChange={handleFileUpload}
          className="text-xs text-ink-muted file:mr-2 file:rounded-chip file:border file:border-edge-strong file:bg-surface file:px-2 file:py-1 file:text-xs file:text-ink-soft"
        />
        <Button
          variant="primary"
          size="sm"
          disabled={isImporting || !pasteText.trim()}
          onClick={handleImport}
          className="ml-auto"
        >
          {isImporting ? "Importing…" : "Import"}
        </Button>
      </div>
      {message && <p className="mt-3 text-xs text-mint">{message}</p>}
    </Panel>
  );
}
