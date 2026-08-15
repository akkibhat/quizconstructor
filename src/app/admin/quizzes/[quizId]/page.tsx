"use client";

import Link from "next/link";
import { use } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { useQuestions } from "@/lib/hooks/useQuestions";
import { useQuiz } from "@/lib/hooks/useQuiz";
import { useRounds } from "@/lib/hooks/useRounds";
import {
  addListRound,
  addRound,
  deleteRound,
  ListRoundAlreadyExistsError,
  swapRoundOrder,
  TooFewRoundsForLongGameError,
} from "@/lib/rounds";
import type { Round } from "@/lib/types/round";

function RoundRow({
  round,
  index,
  realRounds,
  quizId,
  longGameClueCount,
}: {
  round: Round;
  index: number;
  realRounds: Round[];
  quizId: string;
  longGameClueCount: number;
}) {
  const canMoveUp = index > 0;
  const canMoveDown = index < realRounds.length - 1;

  async function handleDelete() {
    if (!confirm(`Delete "${round.title}" and all its questions?`)) return;
    try {
      await deleteRound(quizId, round.id, realRounds.length - 1, longGameClueCount);
    } catch (error) {
      if (error instanceof TooFewRoundsForLongGameError) {
        alert(error.message);
        return;
      }
      throw error;
    }
  }

  return (
    <li className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-900 px-4 py-3">
      <Link
        href={`/admin/quizzes/${quizId}/rounds/${round.id}`}
        className="text-neutral-100 hover:underline"
      >
        {round.title}
        {round.roundType === "list" && (
          <span className="ml-2 rounded border border-sky-800 px-1.5 py-0.5 text-xs text-sky-400">
            Gauntlet
          </span>
        )}
      </Link>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canMoveUp}
          onClick={() => swapRoundOrder(quizId, round, realRounds[index - 1])}
          className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 disabled:opacity-30"
          aria-label="Move round up"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={!canMoveDown}
          onClick={() => swapRoundOrder(quizId, round, realRounds[index + 1])}
          className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 disabled:opacity-30"
          aria-label="Move round down"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded border border-red-900 px-2 py-1 text-xs text-red-400"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function QuizEditor({ quizId }: { quizId: string }) {
  const quiz = useQuiz(quizId);
  const rounds = useRounds(quizId);

  const longGameRound = rounds?.find((r) => r.isLongGame);
  const realRounds = rounds?.filter((r) => !r.isLongGame) ?? [];
  const longGameClues = useQuestions(quizId, longGameRound?.id);

  if (quiz === undefined || rounds === undefined) {
    return <p className="p-10 text-neutral-400">Loading…</p>;
  }

  if (quiz === null) {
    return <p className="p-10 text-neutral-400">No such quiz.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to dashboard
      </Link>

      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-100">{quiz.title}</h1>
        <span className="rounded border border-neutral-700 px-2 py-1 font-mono text-sm text-neutral-400">
          {quiz.code}
        </span>
      </div>
      <p className="mb-8 text-sm text-neutral-500">
        {quiz.doublePointsEnabled &&
          `Double points enabled (${quiz.doublePointsPicksPerTeam} pick${
            quiz.doublePointsPicksPerTeam === 1 ? "" : "s"
          } per team)`}
      </p>

      {quiz.longGameEnabled && longGameRound && (
        <Link
          href={`/admin/quizzes/${quizId}/rounds/${longGameRound.id}`}
          className="mb-8 flex items-center justify-between rounded border border-amber-900 bg-amber-950/30 px-4 py-3 hover:border-amber-700"
        >
          <span className="text-neutral-100">The Long Game</span>
          <span className="text-xs text-neutral-500">
            {longGameClues === undefined
              ? "…"
              : `${longGameClues.length} of ${realRounds.length} clues`}
          </span>
        </Link>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-neutral-100">Rounds</h2>
        <div className="flex items-center gap-2">
          {!realRounds.some((round) => round.roundType === "list") && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await addListRound(quizId, realRounds);
                } catch (error) {
                  if (error instanceof ListRoundAlreadyExistsError) {
                    alert(error.message);
                    return;
                  }
                  throw error;
                }
              }}
              className="rounded border border-sky-800 px-3 py-1.5 text-sm text-sky-400"
            >
              Add The Gauntlet
            </button>
          )}
          <button
            type="button"
            onClick={() => addRound(quizId, realRounds)}
            className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
          >
            Add Round
          </button>
        </div>
      </div>

      <ul className="space-y-2">
        {realRounds.map((round, index) => (
          <RoundRow
            key={round.id}
            round={round}
            index={index}
            realRounds={realRounds}
            quizId={quizId}
            longGameClueCount={longGameClues?.length ?? 0}
          />
        ))}
      </ul>
    </div>
  );
}

export default function QuizDetailPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  return (
    <RequireAuth>
      <QuizEditor quizId={quizId} />
    </RequireAuth>
  );
}
