"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { fieldStyles, fileInputStyles } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { exportQuestionsToTsv, importQuestions, parseQuestionsText } from "@/lib/questionsImportExport";
import { ROUND_FLAVOUR_INFO } from "@/lib/roundFlavourLabels";
import type { Question } from "@/lib/types/question";
import type { RoundFlavour } from "@/lib/types/round";

export function ImportExportSection({
  quizId,
  roundId,
  roundTitle,
  questions,
  flavour,
}: {
  quizId: string;
  roundId: string;
  roundTitle: string;
  questions: Question[];
  flavour: RoundFlavour;
}) {
  // The format is Question/Answer/Points only - it has no column for
  // options, so a batch always lands as plain open questions. Only worth
  // flagging for flavours that actually use options; a Picture This or
  // standard round wouldn't miss what it never wanted.
  const needsOptions = ROUND_FLAVOUR_INFO[flavour].fields.options !== "none";
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
      {needsOptions && (
        <p className="mb-3 rounded-chip border border-flame/40 bg-flame/8 px-3 py-2 text-xs text-flame">
          This format has no column for options, so imported questions land as plain open ones -
          add options to each afterward in the list below.
        </p>
      )}
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
          className={fileInputStyles}
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
