"use client";

import { use, useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { useQuestions } from "@/lib/hooks/useQuestions";
import { useQuiz } from "@/lib/hooks/useQuiz";
import { useRounds } from "@/lib/hooks/useRounds";
import { uploadLongGameClueImage, uploadQuestionAudio, uploadQuestionImage } from "@/lib/media";
import { addQuestion, deleteQuestion, swapQuestionOrder, updateQuestion } from "@/lib/questions";
import { updateRound } from "@/lib/rounds";
import type { AudioPlayMode, Question } from "@/lib/types/question";

function QuestionEditor({
  question,
  index,
  questions,
  quizId,
  roundId,
}: {
  question: Question;
  index: number;
  questions: Question[];
  quizId: string;
  roundId: string;
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
        <span className="pt-2 text-sm text-neutral-500">Q{index + 1}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => swapQuestionOrder(quizId, roundId, question, questions[index - 1])}
            className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 disabled:opacity-30"
            aria-label="Move question up"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={index === questions.length - 1}
            onClick={() => swapQuestionOrder(quizId, roundId, question, questions[index + 1])}
            className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 disabled:opacity-30"
            aria-label="Move question down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this question?")) {
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
        placeholder="Question text"
        onBlur={(event) => updateQuestion(quizId, roundId, question.id, { text: event.target.value })}
        className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
        rows={2}
      />
      <textarea
        defaultValue={question.answer}
        placeholder="Answer"
        onBlur={(event) => updateQuestion(quizId, roundId, question.id, { answer: event.target.value })}
        className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
        rows={1}
      />

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="text-neutral-400">
          Image:{" "}
          <input type="file" accept="image/*" onChange={handleImageChange} disabled={uploading} />
        </label>
        {question.imagePath && <span className="text-xs text-neutral-500">✓ attached</span>}
      </div>

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
    </li>
  );
}

function RoundEditor({ quizId, roundId }: { quizId: string; roundId: string }) {
  const quiz = useQuiz(quizId);
  const rounds = useRounds(quizId);
  const questions = useQuestions(quizId, roundId);
  const [uploadingClueImage, setUploadingClueImage] = useState(false);

  const round = rounds?.find((r) => r.id === roundId);

  if (quiz === undefined || rounds === undefined || questions === undefined) {
    return <p className="p-10 text-neutral-400">Loading…</p>;
  }

  if (quiz === null || !round) {
    return <p className="p-10 text-neutral-400">No such round.</p>;
  }

  async function handleClueImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingClueImage(true);
    try {
      const path = await uploadLongGameClueImage(quizId, roundId, file);
      await updateRound(quizId, roundId, { longGameClueImagePath: path });
    } finally {
      setUploadingClueImage(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <input
        defaultValue={round.title}
        onBlur={(event) => updateRound(quizId, roundId, { title: event.target.value })}
        className="mb-8 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-2xl font-semibold text-neutral-100"
      />

      {quiz.longGameEnabled && (
        <div className="mb-8 space-y-2 rounded border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="text-sm font-medium text-neutral-300">The Long Game clue for this round</h2>
          <textarea
            defaultValue={round.longGameClueText ?? ""}
            placeholder="Clue text"
            onBlur={(event) =>
              updateRound(quizId, roundId, { longGameClueText: event.target.value })
            }
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
            rows={2}
          />
          <label className="text-sm text-neutral-400">
            Clue image:{" "}
            <input
              type="file"
              accept="image/*"
              onChange={handleClueImageChange}
              disabled={uploadingClueImage}
            />
          </label>
          {round.longGameClueImagePath && (
            <span className="ml-2 text-xs text-neutral-500">✓ attached</span>
          )}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-neutral-100">Questions</h2>
        <button
          type="button"
          onClick={() => addQuestion(quizId, roundId, questions)}
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
        >
          Add Question
        </button>
      </div>

      <ul className="space-y-3">
        {questions.map((question, index) => (
          <QuestionEditor
            key={question.id}
            question={question}
            index={index}
            questions={questions}
            quizId={quizId}
            roundId={roundId}
          />
        ))}
      </ul>
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
