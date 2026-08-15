"use client";

import { use, useState } from "react";

import { CodeGateLoading, NotFoundPanel } from "@/components/CodeGateStatus";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, BackLink, SectionHeading } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldStyles, fieldStylesCompact, Label } from "@/components/ui/Field";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { useBankQuestions } from "@/lib/hooks/useBankQuestions";
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog";
import { useQuestions } from "@/lib/hooks/useQuestions";
import { useQuiz } from "@/lib/hooks/useQuiz";
import { useRounds } from "@/lib/hooks/useRounds";
import { uploadQuestionAudio, uploadQuestionImage } from "@/lib/media";
import {
  categoriesOf,
  insertBankQuestionsIntoRound,
  pickRandom,
  saveRoundQuestionsToBank,
} from "@/lib/questionBank";
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
    <Panel as="li" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <span className="font-display text-sm font-semibold tracking-widest text-flame uppercase">
          {isLongGame ? `Clue ${index + 1}` : `Q${index + 1}`}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            disabled={index === 0}
            onClick={() => swapQuestionOrder(quizId, roundId, question, questions[index - 1])}
            aria-label="Move up"
          >
            ↑
          </Button>
          <Button
            size="sm"
            disabled={index === questions.length - 1}
            onClick={() => swapQuestionOrder(quizId, roundId, question, questions[index + 1])}
            aria-label="Move down"
          >
            ↓
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              if (await confirmDialog(isLongGame ? "Delete this clue?" : "Delete this question?")) {
                deleteQuestion(quizId, roundId, question.id);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <textarea
        defaultValue={question.text}
        placeholder={isLongGame ? "Clue text" : "Question text"}
        onBlur={(event) => updateQuestion(quizId, roundId, question.id, { text: event.target.value })}
        className={fieldStyles}
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
            className={cn(fieldStyles, "flex-1")}
            rows={1}
          />
          <div className="flex items-center gap-1.5">
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
              className={cn(fieldStylesCompact, "w-16 tabular-nums")}
              aria-label="Points"
            />
            <span className="text-xs text-ink-muted">pts</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-edge pt-3 text-sm">
        <label className="flex items-center gap-2 text-ink-muted">
          Image:
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={uploading}
            className="text-xs text-ink-muted file:mr-2 file:rounded-chip file:border file:border-edge-strong file:bg-surface file:px-2 file:py-1 file:text-xs file:text-ink-soft"
          />
        </label>
        {question.imagePath && <Badge tone="mint">Attached</Badge>}
      </div>

      {!isLongGame && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-ink-muted">
            Audio:
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              disabled={uploading}
              className="text-xs text-ink-muted file:mr-2 file:rounded-chip file:border file:border-edge-strong file:bg-surface file:px-2 file:py-1 file:text-xs file:text-ink-soft"
            />
          </label>
          {question.audioPath && (
            <select
              value={question.audioPlayMode ?? "manual"}
              onChange={(event) =>
                updateQuestion(quizId, roundId, question.id, {
                  audioPlayMode: event.target.value as AudioPlayMode,
                })
              }
              className={fieldStylesCompact}
            >
              <option value="autoplay">Autoplay (background clue)</option>
              <option value="manual">Manual (name that tune / lyrics)</option>
            </select>
          )}
        </div>
      )}
    </Panel>
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
    <AppShell>
      <BackLink href={`/admin/quizzes/${quizId}`}>Back to quiz</BackLink>

      <div className="mb-2 flex items-center gap-3">
        <Badge tone="mint">The Gauntlet</Badge>
      </div>
      <input
        defaultValue={title}
        onBlur={(event) => updateRound(quizId, roundId, { title: event.target.value })}
        className={cn(fieldStyles, "font-display mb-3 text-2xl font-semibold")}
      />
      <p className="mb-8 text-sm text-ink-muted">
        One shared prompt, scored on how many answers a team gets right in a row before their
        first miss - enter that count as the raw score on the Scoring page, same as any other
        round.
      </p>

      <div className="mb-6 space-y-1.5">
        <Label htmlFor="listPrompt">Prompt (shown to the room)</Label>
        <textarea
          id="listPrompt"
          defaultValue={listPrompt ?? ""}
          placeholder="e.g. Name any 10 of the top 25 busiest airports in the world"
          onBlur={(event) => updateRound(quizId, roundId, { listPrompt: event.target.value })}
          className={fieldStyles}
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="listAnswerReference">Reference list</Label>
          <span className="font-mono text-xs text-mint tabular-nums">
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
          className={cn(fieldStyles, "font-mono text-sm")}
          rows={16}
        />
      </div>
    </AppShell>
  );
}

/**
 * Pulls questions out of the global bank into this round, and pushes this
 * round's questions back up into a pool.
 *
 * Everything is copied rather than linked - a question edited inside a
 * quiz never reaches back into the bank, and vice versa. Drawing from the
 * bank marks those questions as used, which is what lets the picker warn
 * you off repeating material with the same crowd.
 */
function BankSection({
  quizId,
  quizTitle,
  roundId,
  questions,
}: {
  quizId: string;
  quizTitle: string;
  roundId: string;
  questions: Question[];
}) {
  const bank = useBankQuestions();
  const [category, setCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hideUsed, setHideUsed] = useState(true);
  const [saveCategory, setSaveCategory] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const categories = bank ? categoriesOf(bank) : [];
  const inCategory = bank?.filter((q) => q.category === category) ?? [];
  const visible = hideUsed ? inCategory.filter((q) => q.usageCount === 0) : inCategory;
  const selected = (bank ?? []).filter((q) => selectedIds.includes(q.id));

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
    if (!saveCategory.trim()) return;
    setIsBusy(true);
    setMessage(null);
    try {
      const saved = await saveRoundQuestionsToBank(saveCategory, questions);
      setMessage(
        saved === 0
          ? "Nothing to save - this round has no written questions yet."
          : `Saved ${saved} question${saved === 1 ? "" : "s"} to "${saveCategory.trim()}".`
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
              const unused = bank?.filter((q) => q.category === name && q.usageCount === 0).length;
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
            {hideUsed
              ? "Every question in this pool has been used - untick above to reuse one, or add more on the bank page."
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
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="saveCategory"
            list="round-bank-categories"
            value={saveCategory}
            onChange={(event) => setSaveCategory(event.target.value)}
            placeholder="Category name"
            className={cn(fieldStylesCompact, "min-w-[10rem] flex-1")}
          />
          <datalist id="round-bank-categories">
            {categories.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <Button disabled={!saveCategory.trim() || isBusy} onClick={handleSaveToBank}>
            Save to bank
          </Button>
        </div>
      </div>

      {message && <p className="text-xs text-mint">{message}</p>}
    </Panel>
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
    <AppShell>
      <BackLink href={`/admin/quizzes/${quizId}`}>Back to quiz</BackLink>

      {isLongGame ? (
        <>
          <div className="mb-2">
            <Badge tone="gold">The Long Game</Badge>
          </div>
          <h1 className="font-display mb-3 text-3xl font-semibold text-ink">The Long Game</h1>
          <p className="mb-8 text-sm text-ink-muted">
            One clue per round, in order from vaguest to easiest - clue {"{"}
            n{"}"} is shown at the end of round {"{"}n{"}"}. Exactly one clue slot per real round
            is enforced automatically.
          </p>
        </>
      ) : (
        <input
          defaultValue={round.title}
          onBlur={(event) => updateRound(quizId, roundId, { title: event.target.value })}
          className={cn(fieldStyles, "font-display mb-8 text-2xl font-semibold")}
        />
      )}

      {!isLongGame && (
        <>
          <BankSection
            quizId={quizId}
            quizTitle={quiz.title}
            roundId={roundId}
            questions={questions}
          />
          <ImportExportSection
            quizId={quizId}
            roundId={roundId}
            roundTitle={round.title}
            questions={questions}
          />
        </>
      )}

      <SectionHeading
        actions={
          <Button
            variant="primary"
            disabled={atClueCap}
            onClick={() => addQuestion(quizId, roundId, questions)}
          >
            {isLongGame ? "Add Clue" : "Add Question"}
          </Button>
        }
      >
        {isLongGame ? "Clues" : "Questions"}
      </SectionHeading>

      {atClueCap && (
        <p className="mb-4 text-xs text-ink-muted">
          There{"'"}s already one clue per round ({realRoundCount}). Add another round first if
          you need more.
        </p>
      )}

      {questions.length === 0 ? (
        <EmptyState>
          {isLongGame
            ? "No clues yet — add your first one, starting with the vaguest."
            : "No questions yet — add your first one, or paste a batch in via Import above."}
        </EmptyState>
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
    </AppShell>
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
