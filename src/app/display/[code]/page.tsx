"use client";

import { use } from "react";

import { CodeGateLoading, CodeNotFound } from "@/components/CodeGateStatus";
import { LeaderboardView } from "@/components/LeaderboardView";
import { SlideView } from "@/components/SlideView";
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
    <div className="max-w-3xl text-center">
      <p className="mb-4 text-lg tracking-widest text-neutral-500 uppercase">
        {tiebreak.contestedPosition === "top" ? "1st / 2nd / 3rd" : "2nd-to-last"} Tiebreak
      </p>
      <p className="mb-8 text-4xl text-neutral-100">{tiebreak.questionText}</p>

      {tiebreak.revealed && (
        <>
          <p className="mb-6 text-3xl text-emerald-400">Answer: {tiebreak.correctAnswer}</p>
          {tiebreak.mode === "app-computes" && (
            <ul className="space-y-2">
              {contestedTeams.map((team) => (
                <li
                  key={team.id}
                  className={`flex items-center justify-between rounded border px-6 py-3 ${
                    winnerId === team.id
                      ? "border-emerald-600 bg-emerald-950/40"
                      : "border-neutral-800 bg-neutral-900"
                  }`}
                >
                  <span className="text-xl text-neutral-100">
                    {team.name}
                    {winnerId === team.id && (
                      <span className="ml-2 text-sm text-emerald-400">Winner</span>
                    )}
                  </span>
                  <span className="text-xl text-neutral-400">
                    {tiebreak.guesses[team.id] ?? "—"}
                  </span>
                </li>
              ))}
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
        <p className="text-4xl font-semibold text-neutral-100">{quiz.title}</p>
        <p className="mt-4 text-xl text-neutral-500">Waiting for the host to start…</p>
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
    return <h1 className="text-7xl font-bold text-neutral-100">Drinks Break</h1>;
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
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-12">
      <DisplayContent code={code} />
    </div>
  );
}
