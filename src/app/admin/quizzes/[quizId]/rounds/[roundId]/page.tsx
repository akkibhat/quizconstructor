"use client";

import Link from "next/link";
import { use, useState } from "react";

import { CodeGateLoading, NotFoundPanel } from "@/components/CodeGateStatus";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog";
import { useQuestions } from "@/lib/hooks/useQuestions";
import { useQuiz } from "@/lib/hooks/useQuiz";
import { useRounds } from "@/lib/hooks/useRounds";
import { uploadQuestionAudio, uploadQuestionImage } from "@/lib/media";
import { addQuestion, deleteQuestion, swapQuestionOrder, updateQuestion } from "@/lib/questions";
import {
  exportQuestionsToTsv,
  importQuestions,
  parseAnswerList,
  parseQuestionsText,
} from "@/lib/questionsImportExport";
import { updateRound } from "@/lib/rounds";
import type { AudioPlayMode, Question } from "@/lib/types/question";

function QuestionEditor({
  question,
  index,
  questions,
  quizId,
  roundId,
  isLongGame,
  confirmDialog,
}: {
  question: Question;
  index: number;
  questions: Question[];
  quizId: string;
  roundId: string;
  isLongGame: boolean;
  confirmDialog: (message: string) => Promise<boolean>;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadQuestionImage(quizId, question.id, file);
      await updateQuestion(quizId, roundId, question.id, { imagePath: path });
    } finally {
      setUploading(false);
    }
  }

  async function handleAudioChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadQuestionAudio(quizId, question.id, file);
      await updateQuestion(quizId, roundId, question.id, {
        audioPath: path,
        // Default to manual control for newly-attached audio - the host
        // can switch it to autoplay explicitly if it's just background
        // music rather than a "name that tune" style clue.
        audioPlayMode: question.audioPlayMode ?? "manual",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <li className="space-y-3 rounded border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <span className="pt-2 text-sm text-neutral-500">
          {isLongGame ? `Clue ${index + 1}` : `Q${index + 1}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => swapQuestionOrder(quizId, roundId, question, questions[index - 1])}
            className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 disabled:opacity-30"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={index === questions.length - 1}
            onClick={() => swapQuestionOrder(quizId, roundId, question, questions[index + 1])}
            className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 disabled:opacity-30"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={async () => {
              if (await confirmDialog(isLongGame ? "Delete this clue?" : "Delete this question?")) {
                deleteQuestion(quizId, roundId, question.id);
              }
            }}
            className="rounded border border-red-900 px-2 py-1 text-xs text-red-400"
          >
            Delete
          </button>
        </div>
      </div>

      <textarea
        defaultValue={question.text}
        placeholder={isLongGame ? "Clue text" : "Question text"}
        onBlur={(event) => updateQuestion(quizId, roundId, question.id, { text: event.target.value })}
        className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
        rows={2}
      />

      {!isLongGame && (
        <div className="flex gap-2">
          <textarea
            defaultValue={question.answer}
            placeholder="Answer"
            onBlur={(event) =>
              updateQuestion(quizId, roundId, question.id, { answer: event.target.value })
            }
            className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
            rows={1}
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              step={0.5}
              min={0}
              defaultValue={question.points}
              onBlur={(event) =>
                updateQuestion(quizId, roundId, question.id, {
                  points: Number(event.target.value) || 0,
                })
              }
              className="w-16 rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-neutral-100"
              aria-label="Points"
            />
            <span className="text-xs text-neutral-500">pts</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="text-neutral-400">
          Image:{" "}
          <input type="file" accept="image/*" onChange={handleImageChange} disabled={uploading} />
        </label>
        {question.imagePath && <span className="text-xs text-neutral-500">✓ attached</span>}
      </div>

      {!isLongGame && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="text-neutral-400">
            Audio:{" "}
            <input type="file" accept="audio/*" onChange={handleAudioChange} disabled={uploading} />
          </label>
          {question.audioPath && (
            <select
              value={question.audioPlayMode ?? "manual"}
              onChange={(event) =>
                updateQuestion(quizId, roundId, question.id, {
                  audioPlayMode: event.target.value as AudioPlayMode,
                })
              }
              className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
            >
              <option value="autoplay">Autoplay (background clue)</option>
              <option value="manual">Manual (name that tune / lyrics)</option>
            </select>
          )}
        </div>
      )}
    </li>
  );
}

function ListRoundEditor({
  quizId,
  roundId,
  title,
  listPrompt,
  listAnswerReference,
}: {
  quizId: string;
  roundId: string;
  title: string;
  listPrompt: string | null;
  listAnswerReference: string[] | null;
}) {
  // Tracks the parsed count live as the host types/pastes, so they can
  // eyeball "did that paste actually give me 25 answers" before saving -
  // the textarea itself still holds raw text; parseAnswerList only runs
  // for real (and gets saved) on blur.
  const [answerCount, setAnswerCount] = useState(listAnswerReference?.length ?? 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/admin/quizzes/${quizId}`}
        className="mb-4 inline-block text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to quiz
      </Link>

      <input
        defaultValue={title}
        onBlur={(event) => updateRound(quizId, roundId, { title: event.target.value })}
        className="mb-2 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-2xl font-semibold text-neutral-100"
      />
      <p className="mb-8 text-sm text-neutral-500">
        One shared prompt, scored on how many answers a team gets right in a row before their
        first miss - enter that count as the raw score on the Scoring page, same as any other
        round.
      </p>

      <div className="mb-6 space-y-1">
        <label htmlFor="listPrompt" className="text-sm text-neutral-400">
          Prompt (shown to the room)
        </label>
        <textarea
          id="listPrompt"
          defaultValue={listPrompt ?? ""}
          placeholder="e.g. Name any 10 of the top 25 busiest airports in the world"
          onBlur={(event) => updateRound(quizId, roundId, { listPrompt: event.target.value })}
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="listAnswerReference" className="text-sm text-neutral-400">
            Reference list
          </label>
          <span className="text-xs text-neutral-500">
            {answerCount} answer{answerCount === 1 ? "" : "s"}
          </span>
        </div>
        <textarea
          id="listAnswerReference"
          defaultValue={listAnswerReference?.join("\n") ?? ""}
          placeholder="Paste in the full valid-answer list, one per line - your own cheat sheet while marking, also shown to the room as the reveal afterwards. Numbering or bullets are fine, they'll be stripped automatically."
          onChange={(event) => setAnswerCount(parseAnswerList(event.target.value).length)}
          onBlur={(event) => {
            const parsed = parseAnswerList(event.target.value);
            event.target.value = parsed.join("\n");
            setAnswerCount(parsed.length);
            updateRound(quizId, roundId, { listAnswerReference: parsed });
          }}
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm text-neutral-100"
          rows={16}
        />
      </div>
    </div>
  );
}

/**
 * Bulk question entry: export a round's questions to a downloadable .tsv
 * file, or import from a paste (or an uploaded file loaded into the same
 * textarea) - see lib/questionsImportExport.ts for the format. Import
 * always appends to the round's existing questions, never replaces them.
 */
function ImportExportSection({
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
    <div className="mb-6 rounded border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-100">Import / Export</h3>
        <button
          type="button"
          disabled={questions.length === 0}
          onClick={handleExport}
          className="rounded border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 disabled:opacity-30"
        >
          Export as file
        </button>
      </div>
      <p className="mb-2 text-xs text-neutral-500">
        One question per line: Question, Answer, Points (optional, defaults to 1) - separated by
        a Tab (paste straight from a spreadsheet) or a <code>|</code> pipe (if typing by hand).
        Always adds to this round&apos;s existing questions, never replaces them.
      </p>
      <textarea
        value={pasteText}
        onChange={(event) => setPasteText(event.target.value)}
        placeholder={"Capital of France|Paris|1\nCapital of Japan|Tokyo"}
        rows={4}
        className="mb-2 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-100"
      />
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".tsv,.txt,.csv"
          onChange={handleFileUpload}
          className="text-xs text-neutral-400"
        />
        <button
          type="button"
          disabled={isImporting || !pasteText.trim()}
          onClick={handleImport}
          className="rounded bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 disabled:opacity-50"
        >
          {isImporting ? "Importing…" : "Import"}
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-neutral-400">{message}</p>}
    </div>
  );
}

function RoundEditor({ quizId, roundId }: { quizId: string; roundId: string }) {
  const quiz = useQuiz(quizId);
  const rounds = useRounds(quizId);
  const questions = useQuestions(quizId, roundId);
  const { confirmDialog, dialog } = useConfirmDialog();

  const round = rounds?.find((r) => r.id === roundId);
  const isLongGame = round?.isLongGame ?? false;
  const realRoundCount = rounds?.filter((r) => !r.isLongGame).length ?? 0;

  if (quiz === undefined || rounds === undefined || questions === undefined) {
    return <CodeGateLoading />;
  }

  if (quiz === null || !round) {
    return (
      <NotFoundPanel title="Round not found" message="This round doesn't exist, or was deleted." />
    );
  }

  if (round.roundType === "list") {
    return (
      <ListRoundEditor
        quizId={quizId}
        roundId={roundId}
        title={round.title}
        listPrompt={round.listPrompt}
        listAnswerReference={round.listAnswerReference}
      />
    );
  }

  // The Long Game must always have at most one clue per real round - see
  // TooFewRoundsForLongGameError in lib/rounds.ts for the other half of
  // this invariant (blocking round deletion instead of guessing which
  // clue to drop).
  const atClueCap = isLongGame && questions.length >= realRoundCount;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/admin/quizzes/${quizId}`}
        className="mb-4 inline-block text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to quiz
      </Link>

      {isLongGame ? (
        <h1 className="mb-2 text-2xl font-semibold text-neutral-100">The Long Game</h1>
      ) : (
        <input
          defaultValue={round.title}
          onBlur={(event) => updateRound(quizId, roundId, { title: event.target.value })}
          className="mb-8 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-2xl font-semibold text-neutral-100"
        />
      )}

      {isLongGame && (
        <p className="mb-8 text-sm text-neutral-500">
          One clue per round, in order from vaguest to easiest - clue {"{"}
          n{"}"} is shown at the end of round {"{"}n{"}"}. Exactly one clue slot per real round is
          enforced automatically.
        </p>
      )}

      {!isLongGame && (
        <ImportExportSection
          quizId={quizId}
          roundId={roundId}
          roundTitle={round.title}
          questions={questions}
        />
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-neutral-100">
          {isLongGame ? "Clues" : "Questions"}
        </h2>
        <button
          type="button"
          disabled={atClueCap}
          onClick={() => addQuestion(quizId, roundId, questions)}
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-30"
        >
          {isLongGame ? "Add Clue" : "Add Question"}
        </button>
      </div>
      {atClueCap && (
        <p className="mb-4 text-xs text-neutral-500">
          There{"'"}s already one clue per round ({realRoundCount}). Add another round first if
          you need more.
        </p>
      )}

      {questions.length === 0 ? (
        <p className="rounded border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
          {isLongGame
            ? "No clues yet — add your first one, starting with the vaguest."
            : "No questions yet — add your first one, or paste a batch in via Import above."}
        </p>
      ) : (
        <ul className="space-y-3">
          {questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              questions={questions}
              quizId={quizId}
              roundId={roundId}
              isLongGame={isLongGame}
              confirmDialog={confirmDialog}
            />
          ))}
        </ul>
      )}

      {dialog}
    </div>
  );
}

export default function RoundPage({
  params,
}: {
  params: Promise<{ quizId: string; roundId: string }>;
}) {
  const { quizId, roundId } = use(params);
  return (
    <RequireAuth>
      <RoundEditor quizId={quizId} roundId={roundId} />
    </RequireAuth>
  );
}
