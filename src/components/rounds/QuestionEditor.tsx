"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldStyles, fieldStylesCompact, Label } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { uploadQuestionAudio, uploadQuestionImage } from "@/lib/media";
import { deleteQuestion, swapQuestionOrder, updateQuestion } from "@/lib/questions";
import { parseAnswerList } from "@/lib/questionsImportExport";
import type { AudioPlayMode, Question } from "@/lib/types/question";

export function QuestionEditor({
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

      {!isLongGame && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={`options-${question.id}`} className="flex-1">
              Options (one per line) — leave empty for an open question
            </Label>
            {/* Fills in both halves of a true/false question at once,
                since typing "True" and then listing True and False as
                the options by hand is the same three keystrokes every
                time. */}
            <Button
              size="sm"
              onClick={() =>
                updateQuestion(quizId, roundId, question.id, {
                  answer: "True",
                  options: ["True", "False"],
                })
              }
            >
              True
            </Button>
            <Button
              size="sm"
              onClick={() =>
                updateQuestion(quizId, roundId, question.id, {
                  answer: "False",
                  options: ["True", "False"],
                })
              }
            >
              False
            </Button>
          </div>
          <textarea
            id={`options-${question.id}`}
            key={(question.options ?? []).join("\n")}
            defaultValue={(question.options ?? []).join("\n")}
            placeholder={"Trumpet\nTrombone\nClarinet\nTuba"}
            onBlur={(event) => {
              const parsed = parseAnswerList(event.target.value);
              event.target.value = parsed.join("\n");
              updateQuestion(quizId, roundId, question.id, {
                options: parsed.length > 0 ? parsed : null,
              });
            }}
            className={cn(fieldStyles, "text-sm")}
            rows={3}
          />
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
