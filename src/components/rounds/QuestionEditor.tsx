"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChipToggle } from "@/components/ui/ChipToggle";
import { fieldStyles, fieldStylesCompact, fileInputStyles, Label } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { ParsedListField } from "@/components/ui/ParsedListField";
import { cn } from "@/lib/cn";
import { uploadQuestionAudio, uploadQuestionImage } from "@/lib/media";
import { deleteQuestion, swapQuestionOrder, updateQuestion } from "@/lib/questions";
import { ROUND_FLAVOUR_INFO } from "@/lib/roundFlavourLabels";
import type { AudioPlayMode, Question } from "@/lib/types/question";
import type { RoundFlavour } from "@/lib/types/round";

/**
 * The True/False answer picker - two chips instead of a free options
 * list, since the whole point of this flavour is that there's nothing to
 * type. Selecting one sets both `answer` and `options` together, which is
 * what makes the slide's lettered options and the scoring agree.
 */
function TrueFalseAnswer({
  answer,
  onPick,
}: {
  answer: string;
  onPick: (value: "True" | "False") => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="shrink-0">Answer</Label>
      <ChipToggle selected={answer === "True"} onClick={() => onPick("True")}>
        True
      </ChipToggle>
      <ChipToggle selected={answer === "False"} onClick={() => onPick("False")}>
        False
      </ChipToggle>
    </div>
  );
}

/**
 * The Multiple Choice / Odd One Out options list, with a warning while
 * there aren't enough options yet for the flavour to make sense - a
 * two-item "Odd One Out" has nothing to be odd among.
 */
function OptionsList({
  questionId,
  options,
  minOptions,
  onSave,
}: {
  questionId: string;
  options: string[] | null;
  minOptions: number;
  onSave: (parsed: string[]) => void;
}) {
  return (
    <ParsedListField
      id={`options-${questionId}`}
      label="Options"
      unitLabel="option"
      defaultValue={options}
      placeholder={"Trumpet\nTrombone\nClarinet\nTuba"}
      rows={4}
      onSave={onSave}
      renderHint={(count) =>
        count > 0 && count < minOptions ? (
          <p className="text-xs text-flame">
            {count} option{count === 1 ? "" : "s"} set — add at least {minOptions - count} more.
          </p>
        ) : null
      }
    />
  );
}

export function QuestionEditor({
  question,
  index,
  questions,
  quizId,
  roundId,
  isLongGame,
  flavour,
  confirmDialog,
}: {
  question: Question;
  index: number;
  questions: Question[];
  quizId: string;
  roundId: string;
  isLongGame: boolean;
  // Only meaningful when !isLongGame - Long Game clues don't go through
  // the flavour system, they always get the plain text+image fields.
  flavour: RoundFlavour;
  confirmDialog: (message: string) => Promise<boolean>;
}) {
  const [uploading, setUploading] = useState(false);
  const info = ROUND_FLAVOUR_INFO[flavour];

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

  const showImage = isLongGame || info.fields.image;
  const showAudio = !isLongGame && info.fields.audio;

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

      {!isLongGame && info.fields.options === "true-false" && (
        <TrueFalseAnswer
          answer={question.answer}
          onPick={(value) =>
            updateQuestion(quizId, roundId, question.id, {
              answer: value,
              options: ["True", "False"],
            })
          }
        />
      )}

      {!isLongGame && info.fields.options !== "true-false" && (
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

      {!isLongGame && info.fields.options === "list" && (
        <OptionsList
          questionId={question.id}
          options={question.options}
          minOptions={info.fields.minOptions ?? 2}
          onSave={(parsed) =>
            updateQuestion(quizId, roundId, question.id, {
              options: parsed.length > 0 ? parsed : null,
            })
          }
        />
      )}

      {showImage && (
        <div className="flex flex-wrap items-center gap-3 border-t border-edge pt-3 text-sm">
          <label className="flex items-center gap-2 text-ink-muted">
            Image:
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={uploading}
              className={fileInputStyles}
            />
          </label>
          {question.imagePath && <Badge tone="mint">Attached</Badge>}
        </div>
      )}

      {showAudio && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-ink-muted">
            Audio:
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              disabled={uploading}
              className={fileInputStyles}
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
