"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { use } from "react";

import { CodeGateLoading, NotFoundPanel } from "@/components/CodeGateStatus";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog";
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
  confirmDialog,
  alertDialog,
}: {
  round: Round;
  index: number;
  realRounds: Round[];
  quizId: string;
  longGameClueCount: number;
  confirmDialog: (message: string) => Promise<boolean>;
  alertDialog: (message: string) => Promise<void>;
}) {
  const canMoveUp = index > 0;
  const canMoveDown = index < realRounds.length - 1;

  async function handleDelete() {
    if (!(await confirmDialog(`Delete "${round.title}" and all its questions?`))) return;
    try {
      await deleteRound(quizId, round.id, realRounds.length - 1, longGameClueCount);
    } catch (error) {
      if (error instanceof TooFewRoundsForLongGameError) {
        await alertDialog(error.message);
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

// Host-friendly labels for the code-gated views, matching the dashboard's
// quick links - internal route names ("Control", "Display") don't mean
// much to someone skimming a list of buttons.
function liveLinksFor(code: string) {
  return [
    { label: "Team Setup", href: `/team-setup/${code}` },
    { label: "Run Quiz", href: `/control/${code}` },
    { label: "Projector", href: `/display/${code}` },
    { label: "Scoring", href: `/scoring/${code}` },
    { label: "Leaderboard", href: `/leaderboard/${code}` },
  ];
}

function LiveLinksSection({ code }: { code: string }) {
  // Safe to read window directly here (no useState/useEffect dance to
  // avoid a server/client mismatch) - this component only ever renders
  // once RequireAuth has finished its client-side auth check, which never
  // completes during server rendering, so there's no SSR pass of this
  // component to mismatch against.
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-lg font-medium text-neutral-100">Live Links</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {liveLinksFor(code).map((link) => (
          <div
            key={link.href}
            className="flex flex-col items-center gap-2 rounded border border-neutral-800 bg-neutral-900 p-3"
          >
            {origin && (
              <div className="rounded bg-white p-1.5">
                <QRCodeSVG value={`${origin}${link.href}`} size={80} />
              </div>
            )}
            <Link href={link.href} className="text-sm text-neutral-200 hover:underline">
              {link.label}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuizEditor({ quizId }: { quizId: string }) {
  const quiz = useQuiz(quizId);
  const rounds = useRounds(quizId);
  const { confirmDialog, alertDialog, dialog } = useConfirmDialog();

  const longGameRound = rounds?.find((r) => r.isLongGame);
  const realRounds = rounds?.filter((r) => !r.isLongGame) ?? [];
  const longGameClues = useQuestions(quizId, longGameRound?.id);

  if (quiz === undefined || rounds === undefined) {
    return <CodeGateLoading />;
  }

  if (quiz === null) {
    return <NotFoundPanel title="Quiz not found" message="This quiz doesn't exist, or was deleted." />;
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

      <LiveLinksSection code={quiz.code} />

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
                    await alertDialog(error.message);
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

      {realRounds.length === 0 ? (
        <p className="rounded border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
          No rounds yet — add your first one to start building this quiz.
        </p>
      ) : (
        <ul className="space-y-2">
          {realRounds.map((round, index) => (
            <RoundRow
              key={round.id}
              round={round}
              index={index}
              realRounds={realRounds}
              quizId={quizId}
              longGameClueCount={longGameClues?.length ?? 0}
              confirmDialog={confirmDialog}
              alertDialog={alertDialog}
            />
          ))}
        </ul>
      )}

      {dialog}
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
