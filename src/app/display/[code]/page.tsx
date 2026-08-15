"use client";

import { use } from "react";

import { CodeGateLoading, CodeNotFound } from "@/components/CodeGateStatus";
import { LeaderboardView } from "@/components/LeaderboardView";
import { SlideView } from "@/components/SlideView";
import { cn } from "@/lib/cn";
import { useLeaderboardTotals } from "@/lib/hooks/useLeaderboardTotals";
import { useLiveState } from "@/lib/hooks/useLiveState";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useSlideList } from "@/lib/hooks/useSlideList";
import { useTeams } from "@/lib/hooks/useTeams";
import { computeTiebreakWinner } from "@/lib/tieDetection";
import type { TiebreakState } from "@/lib/types/liveState";
import type { Team } from "@/lib/types/team";

function TiebreakDisplay({ tiebreak, teams }: { tiebreak: TiebreakState; teams: Team[] }) {
  const contestedTeams = tiebreak.contestedTeamIds
    .map((teamId) => teams.find((team) => team.id === teamId))
    .filter((team): team is Team => Boolean(team));
  const winnerId =
    tiebreak.mode === "app-computes" && tiebreak.revealed
      ? computeTiebreakWinner(tiebreak.correctAnswer, tiebreak.guesses)
      : null;

  return (
    <div className="w-full max-w-3xl text-center">
      <p className="font-display mb-5 text-xl font-semibold tracking-[0.3em] text-flame uppercase">
        {tiebreak.contestedPosition === "top" ? "1st / 2nd / 3rd" : "2nd-to-last"} Tiebreak
      </p>
      <p className="font-display mb-10 text-5xl leading-tight font-semibold text-balance text-ink">
        {tiebreak.questionText}
      </p>

      {tiebreak.revealed && (
        <>
          <p className="font-display mb-8 text-4xl font-bold text-gold">
            Answer: {tiebreak.correctAnswer}
          </p>
          {tiebreak.mode === "app-computes" && (
            <ul className="space-y-2.5 text-left">
              {contestedTeams.map((team) => {
                const isWinner = winnerId === team.id;
                return (
                  <li
                    key={team.id}
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-panel border px-6 py-4",
                      isWinner ? "border-flame-bright bg-flame edge-dark" : "border-edge bg-surface"
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-3 text-2xl",
                        isWinner ? "font-semibold text-on-flame" : "text-ink"
                      )}
                    >
                      {team.name}
                      {isWinner && (
                        <span className="rounded-chip bg-on-flame/20 px-2 py-0.5 text-xs font-bold tracking-wider text-on-flame uppercase">
                          Winner
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "font-display text-2xl font-bold tabular-nums",
                        isWinner ? "text-on-flame" : "text-ink-muted"
                      )}
                    >
                      {tiebreak.guesses[team.id] ?? "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// Code-only, no login required - this is what's projected on the screen
// for the whole room to see. See the plan doc's quiz access model for why
// that's an intentional, accepted tradeoff.
function DisplayContent({ code }: { code: string }) {
  const quiz = useQuizByCode(code);
  const slides = useSlideList(quiz);
  const liveState = useLiveState(quiz?.id);
  const leaderboard = useLeaderboardTotals(quiz?.id);
  const teams = useTeams(quiz?.id);

  if (quiz === undefined) {
    return <CodeGateLoading variant="screen" />;
  }

  if (quiz === null) {
    return <CodeNotFound code={code} variant="screen" />;
  }

  if (liveState === undefined || slides === undefined) {
    return <CodeGateLoading variant="screen" />;
  }

  if (liveState === null) {
    return (
      <div className="text-center">
        <p className="font-display text-7xl font-bold text-balance text-ink">{quiz.title}</p>
        <p className="font-display mt-6 text-2xl tracking-[0.2em] text-flame uppercase">
          Waiting for the host…
        </p>
      </div>
    );
  }

  if (liveState.mode === "leaderboard") {
    if (leaderboard === undefined) {
      return <CodeGateLoading variant="screen" />;
    }
    return <LeaderboardView entries={leaderboard} revealStage={liveState.leaderboardRevealStage} />;
  }

  if (liveState.mode === "drinks-break") {
    return (
      <div className="text-center">
        <h1 className="font-display text-8xl font-bold tracking-wide text-ink uppercase">
          Drinks Break
        </h1>
        <p className="font-display mt-6 text-2xl tracking-[0.2em] text-flame uppercase">
          Back shortly
        </p>
      </div>
    );
  }

  if (liveState.mode === "tiebreak" && liveState.tiebreak) {
    if (teams === undefined) {
      return <CodeGateLoading variant="screen" />;
    }
    return <TiebreakDisplay tiebreak={liveState.tiebreak} teams={teams} />;
  }

  return <SlideView slide={slides[liveState.slideIndex]} />;
}

export default function DisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return (
    // The projector is framed as a period TV set: a thin warm border
    // around an inset screen with a pool of light at the top. Everything
    // the room sees renders inside that frame.
    <div className="flex min-h-screen items-center justify-center bg-backdrop p-5">
      <div className="tv-screen flex min-h-[calc(100vh-2.5rem)] w-full items-center justify-center rounded-screen border-2 border-flame/30 p-12">
        <DisplayContent code={code} />
      </div>
    </div>
  );
}
