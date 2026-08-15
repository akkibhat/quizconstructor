"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { use } from "react";

import { CodeGateLoading, NotFoundPanel } from "@/components/CodeGateStatus";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, BackLink, PageHeader, QuizCode, SectionHeading } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, Panel } from "@/components/ui/Panel";
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
    <Panel as="li" className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-display w-6 shrink-0 text-lg font-bold text-ink-muted tabular-nums">
          {index + 1}
        </span>
        <Link
          href={`/admin/quizzes/${quizId}/rounds/${round.id}`}
          className="flex min-w-0 items-center gap-2 text-ink transition-colors hover:text-flame"
        >
          <span className="truncate">{round.title}</span>
          {round.roundType === "list" && <Badge tone="mint">Gauntlet</Badge>}
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          size="sm"
          disabled={!canMoveUp}
          onClick={() => swapRoundOrder(quizId, round, realRounds[index - 1])}
          aria-label="Move round up"
        >
          ↑
        </Button>
        <Button
          size="sm"
          disabled={!canMoveDown}
          onClick={() => swapRoundOrder(quizId, round, realRounds[index + 1])}
          aria-label="Move round down"
        >
          ↓
        </Button>
        <Button variant="danger" size="sm" onClick={handleDelete}>
          Delete
        </Button>
      </div>
    </Panel>
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
    <div className="mb-10">
      <SectionHeading>Live Links</SectionHeading>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {liveLinksFor(code).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-2.5 rounded-panel border border-edge bg-surface p-3.5 transition-colors hover:border-flame/60"
          >
            {origin && (
              <div className="rounded-chip bg-ink p-1.5">
                <QRCodeSVG value={`${origin}${link.href}`} size={80} bgColor="#f9f0dd" fgColor="#0a2b2c" />
              </div>
            )}
            <span className="text-sm font-medium text-ink-soft">{link.label}</span>
          </Link>
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
    <AppShell>
      <BackLink href="/">Back to dashboard</BackLink>

      <PageHeader
        eyebrow="Quiz"
        title={quiz.title}
        meta={<QuizCode code={quiz.code} />}
        description={
          quiz.doublePointsEnabled
            ? `Double points enabled — ${quiz.doublePointsPicksPerTeam} pick${
                quiz.doublePointsPicksPerTeam === 1 ? "" : "s"
              } per team.`
            : undefined
        }
      />

      <LiveLinksSection code={quiz.code} />

      {quiz.longGameEnabled && longGameRound && (
        <Link
          href={`/admin/quizzes/${quizId}/rounds/${longGameRound.id}`}
          className="mb-10 flex items-center justify-between gap-3 rounded-panel border border-gold/40 bg-gold/8 px-4 py-3.5 transition-colors hover:border-gold"
        >
          <span className="font-display font-semibold tracking-wide text-gold uppercase">
            The Long Game
          </span>
          <span className="text-xs text-ink-muted">
            {longGameClues === undefined
              ? "…"
              : `${longGameClues.length} of ${realRounds.length} clues`}
          </span>
        </Link>
      )}

      <SectionHeading
        actions={
          <>
            {!realRounds.some((round) => round.roundType === "list") && (
              <Button
                size="md"
                className="border-mint/45 text-mint hover:border-mint hover:text-mint"
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
              >
                Add The Gauntlet
              </Button>
            )}
            <Button variant="primary" onClick={() => addRound(quizId, realRounds)}>
              Add Round
            </Button>
          </>
        }
      >
        Rounds
      </SectionHeading>

      {realRounds.length === 0 ? (
        <EmptyState>No rounds yet — add your first one to start building this quiz.</EmptyState>
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
    </AppShell>
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
