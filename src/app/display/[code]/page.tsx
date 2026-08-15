"use client";

import { use } from "react";

import { LeaderboardView } from "@/components/LeaderboardView";
import { SlideView } from "@/components/SlideView";
import { useLeaderboardTotals } from "@/lib/hooks/useLeaderboardTotals";
import { useLiveState } from "@/lib/hooks/useLiveState";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useSlideList } from "@/lib/hooks/useSlideList";

// Code-only, no login required - this is what's projected on the screen
// for the whole room to see. See the plan doc's quiz access model for why
// that's an intentional, accepted tradeoff.
function DisplayContent({ code }: { code: string }) {
  const quiz = useQuizByCode(code);
  const slides = useSlideList(quiz);
  const liveState = useLiveState(quiz?.id);
  const leaderboard = useLeaderboardTotals(quiz?.id);

  if (quiz === undefined) {
    return <p className="text-2xl text-neutral-500">Loading…</p>;
  }

  if (quiz === null) {
    return (
      <p className="text-2xl text-neutral-500">No quiz found for code &quot;{code}&quot;.</p>
    );
  }

  if (liveState === undefined || slides === undefined) {
    return <p className="text-2xl text-neutral-500">Loading…</p>;
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
      return <p className="text-2xl text-neutral-500">Loading…</p>;
    }
    return <LeaderboardView entries={leaderboard} revealStage={liveState.leaderboardRevealStage} />;
  }

  if (liveState.mode === "drinks-break") {
    return <h1 className="text-7xl font-bold text-neutral-100">Drinks Break</h1>;
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
