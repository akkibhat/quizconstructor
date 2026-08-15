"use client";

import { use, useEffect, useRef, useState } from "react";

import { CodeGateLoading, CodeNotFound } from "@/components/CodeGateStatus";
import { LeaderboardView } from "@/components/LeaderboardView";
import { RequireAuth } from "@/components/RequireAuth";
import { SlideView } from "@/components/SlideView";
import { AppShell, PageHeader } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldStyles, fieldStylesCompact } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeaderboardTotals } from "@/lib/hooks/useLeaderboardTotals";
import { useLiveState } from "@/lib/hooks/useLiveState";
import { useMediaUrl } from "@/lib/hooks/useMediaUrl";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useSlideList } from "@/lib/hooks/useSlideList";
import { useTeams } from "@/lib/hooks/useTeams";
import { useTiebreakQuestions } from "@/lib/hooks/useTiebreakQuestions";
import {
  endTiebreak,
  goNext,
  goPrev,
  revealTiebreak,
  setLeaderboardRevealStage,
  setLiveMode,
  setTiebreakGuess,
  startQuiz,
  startTiebreak,
} from "@/lib/liveState";
import { computeTiebreakWinner, unresolvedTieGroups, type TieGroup } from "@/lib/tieDetection";
import {
  applyTiebreakResult,
  detectDeadHeats,
  rankTeamsByGuess,
  spliceResolvedOrder,
} from "@/lib/tiebreakResults";
import type { AudioPlayMode } from "@/lib/types/question";
import type { TiebreakMode, TiebreakState } from "@/lib/types/liveState";
import type { TiebreakQuestion } from "@/lib/types/tiebreakQuestion";
import type { Team } from "@/lib/types/team";

/**
 * Play/pause/stop for a question's attached audio. Playback is local to
 * this component only - never synced through Firestore - since the host's
 * own laptop is what's physically wired to the venue's speakers regardless
 * of which window (Controller or Display) triggers it. See the plan doc's
 * Slide-List Engine section for the full reasoning.
 */
function AudioControls({
  audioPath,
  audioPlayMode,
}: {
  audioPath: string;
  audioPlayMode: AudioPlayMode;
}) {
  const audioUrl = useMediaUrl(audioPath);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (audioPlayMode === "autoplay" && audioUrl) {
      audioRef.current?.play();
    }
  }, [audioPlayMode, audioUrl]);

  if (!audioUrl) {
    return null;
  }

  return (
    <div className="flex items-center gap-2.5 rounded-panel border border-edge bg-surface px-4 py-2.5">
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <Button
        variant="primary"
        onClick={() => (isPlaying ? audioRef.current?.pause() : audioRef.current?.play())}
      >
        {isPlaying ? "Pause" : "Play"}
      </Button>
      <Button
        onClick={() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
        }}
      >
        Stop
      </Button>
      <Badge className="ml-auto">{audioPlayMode === "autoplay" ? "Autoplay" : "Manual"}</Badge>
    </div>
  );
}

/**
 * Flags any ties at a contested position (1st/2nd/3rd or 2nd-to-last -
 * see detectTiedPositions) and lets the host pick a tiebreak question from
 * the bank plus a resolution mode to kick off startTiebreak.
 */
function TieAlertBanner({
  quizId,
  hostUid,
  tieGroups,
  tiebreakQuestions,
}: {
  quizId: string;
  hostUid: string;
  tieGroups: TieGroup[];
  tiebreakQuestions: TiebreakQuestion[] | undefined;
}) {
  const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [mode, setMode] = useState<TiebreakMode>("app-computes");

  if (tieGroups.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-2">
      {tieGroups.map((group, index) => (
        <div
          key={index}
          className="rounded-panel border border-danger/50 bg-danger/10 p-4 text-sm"
        >
          <p className="text-ink">
            <span className="font-display font-semibold tracking-wide text-danger uppercase">
              Tie for {group.position === "top" ? "1st/2nd/3rd" : "2nd-to-last"}
            </span>
            <br />
            {group.teams.map((team) => team.name).join(", ")} — all {group.score} pts
          </p>
          {resolvingIndex === index ? (
            <div className="mt-3 space-y-3">
              <select
                value={selectedQuestionId}
                onChange={(event) => setSelectedQuestionId(event.target.value)}
                className={fieldStyles}
              >
                <option value="">Pick a tiebreak question…</option>
                {tiebreakQuestions?.map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.question}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-4 text-ink-soft">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    checked={mode === "app-computes"}
                    onChange={() => setMode("app-computes")}
                    className="accent-flame"
                  />
                  App computes winner
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    checked={mode === "manual"}
                    onChange={() => setMode("manual")}
                    className="accent-flame"
                  />
                  I&apos;ll judge manually
                </label>
              </div>
              <Button
                variant="primary"
                disabled={!selectedQuestionId}
                onClick={() => {
                  const question = tiebreakQuestions?.find((q) => q.id === selectedQuestionId);
                  if (!question) return;
                  startTiebreak(
                    quizId,
                    hostUid,
                    question.question,
                    question.answer,
                    group.position,
                    group.teams.map((team) => team.teamId),
                    mode,
                    // Recorded from the outset so that if this question
                    // fails to separate anyone, the decider that follows
                    // can't pick the same one again.
                    {
                      attempt: 1,
                      pendingOrder: null,
                      pendingDeadHeats: [],
                      usedQuestionIds: [question.id],
                    }
                  );
                  setResolvingIndex(null);
                  setSelectedQuestionId("");
                }}
              >
                Start Tiebreak
              </Button>
            </div>
          ) : (
            <Button variant="danger" size="sm" className="mt-3" onClick={() => setResolvingIndex(index)}>
              Resolve Tie
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Runs the active tiebreak: shows the question, collects guesses or reveals the answer, and (in app-computes mode) the winner. */
function TiebreakPanel({
  quizId,
  hostUid,
  tiebreak,
  teams,
  tiebreakQuestions,
}: {
  quizId: string;
  hostUid: string;
  tiebreak: TiebreakState;
  teams: Team[];
  tiebreakQuestions: TiebreakQuestion[] | undefined;
}) {
  const contestedTeams = tiebreak.contestedTeamIds
    .map((teamId) => teams.find((team) => team.id === teamId))
    .filter((team): team is Team => Boolean(team));
  const computedWinnerId =
    tiebreak.mode === "app-computes" && tiebreak.revealed
      ? computeTiebreakWinner(tiebreak.correctAnswer, tiebreak.guesses)
      : null;

  // In manual mode the host judges from paper, so the app has no way to
  // work out who won - they tell it by clicking the winning team here.
  const [manualWinnerId, setManualWinnerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Ranking - and spotting teams it failed to separate - only means
  // anything once every contested team has a guess recorded.
  const allGuessesIn = tiebreak.contestedTeamIds.every(
    (teamId) => tiebreak.guesses[teamId] !== undefined
  );
  const spentQuestionIds = tiebreak.usedQuestionIds ?? [];
  const followUpsAvailable = (tiebreakQuestions ?? []).filter(
    (question) => !spentQuestionIds.includes(question.id)
  ).length;

  const deadHeats =
    tiebreak.mode === "app-computes" && tiebreak.revealed && allGuessesIn
      ? detectDeadHeats(
          tiebreak.correctAnswer,
          tiebreak.guesses,
          rankTeamsByGuess(tiebreak.correctAnswer, tiebreak.guesses, tiebreak.contestedTeamIds)
        )
      : [];
  // Nobody in a dead heat has won anything yet, so none of them get the
  // winner treatment - that's the whole point of catching it.
  const levelTeamIds = new Set(deadHeats.flat());

  const winnerId = tiebreak.mode === "app-computes" ? computedWinnerId : manualWinnerId;
  const canProceed =
    tiebreak.revealed &&
    (tiebreak.mode === "app-computes"
      ? allGuessesIn && (deadHeats.length === 0 || followUpsAvailable > 0)
      : Boolean(manualWinnerId));

  /**
   * Records the placing, then returns to the leaderboard - unless the
   * guesses failed to separate somebody, in which case it pulls a fresh
   * question and runs another decider between just those teams.
   *
   * Until a result is actually recorded the tie stays flagged as
   * outstanding, and leaving via "Back to Leaderboard" records nothing -
   * so an abandoned tiebreak can't quietly award a prize.
   *
   * Ranking everyone rather than only the winner matters for a tie across
   * the podium, where 2nd and 3rd are real placings too. For a tie at the
   * bottom only the winner means anything (they take the prize; the board
   * isn't reordered), but ranking the rest is what marks the whole group
   * as settled so the "Tiebreak pending" badges clear.
   */
  async function confirmResult() {
    if (!canProceed) return;
    setIsSaving(true);
    try {
      const ranked =
        tiebreak.mode === "app-computes"
          ? rankTeamsByGuess(tiebreak.correctAnswer, tiebreak.guesses, tiebreak.contestedTeamIds)
          : [
              manualWinnerId as string,
              ...tiebreak.contestedTeamIds.filter((id) => id !== manualWinnerId),
            ];

      // Fold this attempt's result into the order built up so far, so a
      // re-run between two teams never disturbs anyone already separated.
      const fullOrder = tiebreak.pendingOrder
        ? spliceResolvedOrder(tiebreak.pendingOrder, tiebreak.contestedTeamIds, ranked)
        : ranked;

      // A host judging manually has, by definition, separated them.
      const stillLevel =
        tiebreak.mode === "app-computes"
          ? detectDeadHeats(tiebreak.correctAnswer, tiebreak.guesses, ranked)
          : [];
      const queue = [...stillLevel, ...(tiebreak.pendingDeadHeats ?? [])];

      if (queue.length > 0 && (await runDecider(queue[0], fullOrder, queue.slice(1)))) {
        return;
      }

      await applyTiebreakResult(quizId, tiebreak.contestedPosition, fullOrder);
      await endTiebreak(quizId, hostUid);
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Starts another attempt between `stillContested`, using a question
   * this chain hasn't spent yet. Returns false if the bank has nothing
   * left to ask, so the caller can fall back rather than hang.
   */
  async function runDecider(
    stillContested: string[],
    orderSoFar: string[] | null,
    queued: string[][]
  ): Promise<boolean> {
    const spent = tiebreak.usedQuestionIds ?? [];
    const available = (tiebreakQuestions ?? []).filter((q) => !spent.includes(q.id));
    if (available.length === 0) return false;

    const next = available[Math.floor(Math.random() * available.length)];
    await startTiebreak(
      quizId,
      hostUid,
      next.question,
      next.answer,
      tiebreak.contestedPosition,
      stillContested,
      tiebreak.mode,
      {
        attempt: (tiebreak.attempt ?? 1) + 1,
        pendingOrder: orderSoFar,
        pendingDeadHeats: queued,
        usedQuestionIds: [...spent, next.id],
      }
    );
    return true;
  }

  /**
   * Manual mode's escape hatch: the host has looked at the paper answers
   * and can't split them either - both wrote the same thing, or both are
   * equally wrong. Runs a fresh question between the same teams.
   *
   * Nothing new has been established, so the order built up so far is
   * carried through untouched rather than being guessed at.
   */
  async function declareDeadHeat() {
    setIsSaving(true);
    try {
      await runDecider(
        tiebreak.contestedTeamIds,
        tiebreak.pendingOrder ?? null,
        tiebreak.pendingDeadHeats ?? []
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell
      actions={
        <Button onClick={() => endTiebreak(quizId, hostUid)}>Back to Leaderboard</Button>
      }
    >
      <PageHeader
        eyebrow={`${tiebreak.contestedPosition === "top" ? "1st / 2nd / 3rd" : "2nd-to-last"} tiebreak`}
        title={(tiebreak.attempt ?? 1) > 1 ? `Decider ${tiebreak.attempt}` : "Tiebreak"}
        description={
          (tiebreak.attempt ?? 1) > 1
            ? "The last question couldn't separate these teams, so here's a fresh one between just them."
            : undefined
        }
      />

      <div className="tv-screen mb-6 rounded-screen border-2 border-flame/30 p-8 text-center">
        <p className="font-display text-2xl font-semibold text-balance text-ink">
          {tiebreak.questionText}
        </p>
        {tiebreak.revealed && (
          <p className="font-display mt-4 text-xl font-bold text-gold">
            Answer: {tiebreak.correctAnswer}
          </p>
        )}
      </div>

      {tiebreak.mode === "app-computes" ? (
        <div className="space-y-2">
          {contestedTeams.map((team) => {
            const isLevel = levelTeamIds.has(team.id);
            const isWinner = winnerId === team.id && !isLevel;
            const guess = tiebreak.guesses[team.id];
            const distance =
              tiebreak.revealed && guess !== undefined
                ? Math.abs(guess - tiebreak.correctAnswer)
                : null;
            return (
              <div
                key={team.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-panel border p-3",
                  isWinner
                    ? "border-flame bg-flame/15"
                    : isLevel
                      ? "border-danger/50 bg-danger/10"
                      : "border-edge bg-surface"
                )}
              >
                <span className="flex flex-wrap items-center gap-2 text-ink">
                  {team.name}
                  {isWinner && <Badge tone="flame">Winner</Badge>}
                  {isLevel && (
                    <span className="rounded-chip border border-danger/50 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-danger uppercase">
                      Level
                    </span>
                  )}
                  {distance !== null && (
                    <span className="text-xs text-ink-muted tabular-nums">{distance} away</span>
                  )}
                </span>
                <input
                  type="number"
                  defaultValue={tiebreak.guesses[team.id] ?? ""}
                  onBlur={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isNaN(value)) {
                      setTiebreakGuess(quizId, hostUid, tiebreak, team.id, value);
                    }
                  }}
                  className={cn(fieldStylesCompact, "w-32 tabular-nums")}
                  placeholder="Guess"
                />
              </div>
            );
          })}
          {!tiebreak.revealed && (
            <Button
              variant="primary"
              size="lg"
              className="mt-2"
              onClick={() => revealTiebreak(quizId, hostUid, tiebreak)}
            >
              Reveal Winner
            </Button>
          )}
        </div>
      ) : (
        <div>
          {tiebreak.revealed && (
            <p className="mb-3 text-sm text-ink-muted">Tap whoever came closest:</p>
          )}
          <div className="space-y-2">
            {contestedTeams.map((team) => {
              const isWinner = winnerId === team.id;
              return (
                <button
                  key={team.id}
                  type="button"
                  disabled={!tiebreak.revealed}
                  onClick={() => setManualWinnerId(team.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-panel border p-3 text-left transition-colors",
                    isWinner
                      ? "border-flame bg-flame/15"
                      : "border-edge bg-surface enabled:hover:border-flame/60",
                    !tiebreak.revealed && "cursor-default opacity-70"
                  )}
                >
                  <span className="text-ink">{team.name}</span>
                  {isWinner && <Badge tone="flame">Winner</Badge>}
                </button>
              );
            })}
          </div>
          {!tiebreak.revealed ? (
            <Button
              variant="primary"
              size="lg"
              className="mt-4"
              onClick={() => revealTiebreak(quizId, hostUid, tiebreak)}
            >
              Reveal Answer
            </Button>
          ) : (
            <div className="mt-4">
              <Button
                variant="danger"
                disabled={followUpsAvailable === 0 || isSaving}
                onClick={declareDeadHeat}
              >
                {isSaving ? "Starting…" : "Dead heat — run another question"}
              </Button>
              <p className="mt-2 text-xs text-ink-muted">
                {followUpsAvailable > 0
                  ? `Can't split them? This pulls a fresh question and runs it between the same teams. ${followUpsAvailable} unused question${followUpsAvailable === 1 ? "" : "s"} left.`
                  : "No unused questions left in the bank to run a decider with."}
              </p>
            </div>
          )}
        </div>
      )}

      {tiebreak.revealed && (
        <div className="mt-6 border-t border-edge pt-5">
          {deadHeats.length > 0 && (
            <p className="mb-3 rounded-panel border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-ink">
              <span className="font-display font-semibold tracking-wide text-danger uppercase">
                Dead heat
              </span>
              <br />
              {deadHeats
                .map((group) =>
                  group
                    .map((teamId) => teams.find((team) => team.id === teamId)?.name ?? "?")
                    .join(" and ")
                )
                .join("; ")}{" "}
              — exactly as close as each other, so nobody has won yet.
              {followUpsAvailable > 0
                ? " Confirming pulls a fresh question and runs a decider between just them."
                : " Add more tiebreak questions to the bank to run a decider."}
            </p>
          )}

          <Button variant="primary" size="lg" disabled={!canProceed || isSaving} onClick={confirmResult}>
            {isSaving
              ? "Saving…"
              : deadHeats.length > 0
                ? "Run a decider"
                : "Confirm result & finish"}
          </Button>

          <p className="mt-2 text-xs text-ink-muted">
            {!tiebreak.revealed
              ? null
              : deadHeats.length > 0
                ? followUpsAvailable > 0
                  ? `${followUpsAvailable} unused question${followUpsAvailable === 1 ? "" : "s"} left in the bank.`
                  : "No unused questions left — nothing to run a decider with."
                : canProceed
                  ? "Records the placing and returns to the leaderboard, where the prize badge will appear."
                  : tiebreak.mode === "manual"
                    ? "Pick the winning team above first."
                    : "Enter every team's guess above first."}
          </p>
        </div>
      )}
    </AppShell>
  );
}

function ControllerContent({ code }: { code: string }) {
  const { user } = useAuth();
  const quiz = useQuizByCode(code);
  const slides = useSlideList(quiz);
  const liveState = useLiveState(quiz?.id);
  const leaderboard = useLeaderboardTotals(quiz?.id);
  const teams = useTeams(quiz?.id);
  const tiebreakQuestions = useTiebreakQuestions();

  // Arrow-key shortcuts. In presenter mode they move between slides; in
  // leaderboard mode the same two keys step the progressive reveal
  // forward/backward instead, mirroring whichever button row is showing.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!quiz || !slides || !liveState || !user) return;

      if (liveState.mode === "leaderboard") {
        if (event.key === "ArrowRight") {
          setLeaderboardRevealStage(
            quiz.id,
            Math.min(liveState.leaderboardRevealStage + 1, 3) as 0 | 1 | 2 | 3,
            user.uid
          );
        } else if (event.key === "ArrowLeft") {
          setLeaderboardRevealStage(
            quiz.id,
            Math.max(liveState.leaderboardRevealStage - 1, 0) as 0 | 1 | 2 | 3,
            user.uid
          );
        }
        return;
      }

      // Drinks Break and Tiebreak have their own on-screen controls and no
      // arrow-key shortcuts of their own - without this guard, arrow keys
      // would silently advance the presenter's slideIndex in the
      // background while one of those screens is showing, so returning to
      // "presenter" mode later would jump further than expected.
      if (liveState.mode !== "presenter") {
        return;
      }

      if (event.key === "ArrowRight") {
        goNext(quiz.id, liveState.slideIndex, slides.length, user.uid);
      } else if (event.key === "ArrowLeft") {
        goPrev(quiz.id, liveState.slideIndex, user.uid);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quiz, slides, liveState, user]);

  if (quiz === undefined || !user) {
    return <CodeGateLoading />;
  }

  if (quiz === null) {
    return <CodeNotFound code={code} />;
  }

  if (slides === undefined || liveState === undefined) {
    return <CodeGateLoading />;
  }

  if (liveState === null) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-flame uppercase">
            Ready when you are
          </p>
          <h1 className="font-display mb-8 text-4xl font-bold text-balance text-ink">
            {quiz.title}
          </h1>
          <Button variant="primary" size="lg" onClick={() => startQuiz(quiz.id, user.uid)}>
            Start Quiz
          </Button>
        </div>
      </AppShell>
    );
  }

  if (liveState.mode === "tiebreak" && liveState.tiebreak) {
    if (teams === undefined) {
      return <CodeGateLoading />;
    }
    return (
      <TiebreakPanel
        quizId={quiz.id}
        hostUid={user.uid}
        tiebreak={liveState.tiebreak}
        teams={teams}
        tiebreakQuestions={tiebreakQuestions}
      />
    );
  }

  if (liveState.mode === "drinks-break") {
    return (
      <AppShell
        actions={
          <Button variant="primary" onClick={() => setLiveMode(quiz.id, "presenter", user.uid)}>
            Back to Quiz
          </Button>
        }
      >
        <PageHeader eyebrow="On screen" title={quiz.title} />
        <div className="tv-screen flex min-h-[220px] items-center justify-center rounded-screen border-2 border-flame/30 p-8">
          <h2 className="font-display text-4xl font-bold tracking-wide text-ink uppercase">
            Drinks Break
          </h2>
        </div>
      </AppShell>
    );
  }

  if (liveState.mode === "leaderboard") {
    if (leaderboard === undefined) {
      return <CodeGateLoading />;
    }

    const stage = liveState.leaderboardRevealStage;
    return (
      <AppShell
        width="wide"
        actions={
          <Button variant="primary" onClick={() => setLiveMode(quiz.id, "presenter", user.uid)}>
            Back to Quiz
          </Button>
        }
      >
        <PageHeader eyebrow="On screen" title={quiz.title} />

        {stage === 3 && (
          <TieAlertBanner
            quizId={quiz.id}
            hostUid={user.uid}
            tieGroups={unresolvedTieGroups(leaderboard)}
            tiebreakQuestions={tiebreakQuestions}
          />
        )}

        <div className="tv-screen mb-6 flex justify-center rounded-screen border-2 border-flame/30 p-8">
          <LeaderboardView entries={leaderboard} revealStage={stage} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            disabled={stage === 0}
            onClick={() =>
              setLeaderboardRevealStage(quiz.id, (stage - 1) as 0 | 1 | 2 | 3, user.uid)
            }
          >
            ← Reveal less
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={stage === 3}
            onClick={() =>
              setLeaderboardRevealStage(quiz.id, (stage + 1) as 0 | 1 | 2 | 3, user.uid)
            }
          >
            Reveal next →
          </Button>
          <span className="text-xs text-ink-muted">(or use arrow keys)</span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={stage === 0}
            onClick={() => setLeaderboardRevealStage(quiz.id, 0, user.uid)}
          >
            Hide all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={stage === 3}
            onClick={() => setLeaderboardRevealStage(quiz.id, 3, user.uid)}
          >
            Show all now (skip the reveal)
          </Button>
        </div>
      </AppShell>
    );
  }

  const currentSlide = slides[liveState.slideIndex];
  const nextSlide = slides[liveState.slideIndex + 1];

  return (
    <AppShell
      width="wide"
      actions={
        <>
          <Button onClick={() => setLiveMode(quiz.id, "drinks-break", user.uid)}>
            Drinks Break
          </Button>
          <Button onClick={() => setLiveMode(quiz.id, "leaderboard", user.uid)}>
            Leaderboard
          </Button>
        </>
      }
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-flame uppercase">
            On screen
          </p>
          <h1 className="font-display text-2xl font-semibold text-ink">{quiz.title}</h1>
        </div>
        <span className="font-mono text-sm text-ink-muted tabular-nums">
          Slide {liveState.slideIndex + 1} / {slides.length}
        </span>
      </div>

      {/* Scaled down so the projector's real slide layout stays readable
          here without dwarfing the controls underneath it. */}
      <div className="tv-screen mb-4 flex min-h-[260px] items-center justify-center overflow-hidden rounded-screen border-2 border-flame/30 p-8">
        <div className="origin-center scale-[0.55]">
          <SlideView slide={currentSlide} />
        </div>
      </div>

      {currentSlide &&
        currentSlide.type === "question" &&
        currentSlide.audioPath &&
        currentSlide.audioPlayMode && (
          <div className="mb-4">
            <AudioControls
              audioPath={currentSlide.audioPath}
              audioPlayMode={currentSlide.audioPlayMode}
            />
          </div>
        )}

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          disabled={liveState.slideIndex === 0}
          onClick={() => goPrev(quiz.id, liveState.slideIndex, user.uid)}
        >
          ← Previous
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={liveState.slideIndex >= slides.length - 1}
          onClick={() => goNext(quiz.id, liveState.slideIndex, slides.length, user.uid)}
        >
          Next →
        </Button>
        <span className="text-xs text-ink-muted">(or use arrow keys)</span>
      </div>

      {nextSlide && (
        <div className="rounded-panel border border-edge bg-surface/50 p-4">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
            Coming up
          </p>
          <div className="flex h-24 items-center justify-center overflow-hidden opacity-70">
            <div className="origin-center scale-[0.32]">
              <SlideView slide={nextSlide} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function ControlPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return (
    <RequireAuth>
      <ControllerContent code={code} />
    </RequireAuth>
  );
}
