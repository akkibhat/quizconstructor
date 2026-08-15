"use client";

import Link from "next/link";
import { use } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { useQuiz } from "@/lib/hooks/useQuiz";
import { useRounds } from "@/lib/hooks/useRounds";
import { addRound, deleteRound, swapRoundOrder } from "@/lib/rounds";
import type { Round } from "@/lib/types/round";

function RoundRow({
  round,
  index,
  rounds,
  quizId,
}: {
  round: Round;
  index: number;
  rounds: Round[];
  quizId: string;
}) {
  const canMoveUp = index > 0;
  const canMoveDown = index < rounds.length - 1;

  return (
    <li className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-900 px-4 py-3">
      <Link
        href={`/admin/quizzes/${quizId}/rounds/${round.id}`}
        className="text-neutral-100 hover:underline"
      >
        {round.title}
      </Link>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canMoveUp}
          onClick={() => swapRoundOrder(quizId, round, rounds[index - 1])}
          className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 disabled:opacity-30"
          aria-label="Move round up"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={!canMoveDown}
          onClick={() => swapRoundOrder(quizId, round, rounds[index + 1])}
          className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 disabled:opacity-30"
          aria-label="Move round down"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${round.title}" and all its questions?`)) {
              deleteRound(quizId, round.id, rounds.length - 1);
            }
          }}
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

  if (quiz === undefined || rounds === undefined) {
    return <p className="p-10 text-neutral-400">Loading…</p>;
  }

  if (quiz === null) {
    return <p className="p-10 text-neutral-400">No such quiz.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-100">{quiz.title}</h1>
        <span className="rounded border border-neutral-700 px-2 py-1 font-mono text-sm text-neutral-400">
          {quiz.code}
        </span>
      </div>
      <p className="mb-8 text-sm text-neutral-500">
        {quiz.longGameEnabled && "The Long Game enabled"}
        {quiz.longGameEnabled && quiz.doublePointsEnabled && " · "}
        {quiz.doublePointsEnabled &&
          `Double points enabled (${quiz.doublePointsPicksPerTeam} pick${
            quiz.doublePointsPicksPerTeam === 1 ? "" : "s"
          } per team)`}
      </p>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-neutral-100">Rounds</h2>
        <button
          type="button"
          onClick={() => addRound(quizId, rounds)}
          className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
        >
          Add Round
        </button>
      </div>

      <ul className="space-y-2">
        {rounds.map((round, index) => (
          <RoundRow key={round.id} round={round} index={index} rounds={rounds} quizId={quizId} />
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
