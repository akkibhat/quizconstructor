"use client";

import { use } from "react";

import { CodeGateLoading, CodeNotFound } from "@/components/CodeGateStatus";
import { LeaderboardView } from "@/components/LeaderboardView";
import { useLeaderboardTotals } from "@/lib/hooks/useLeaderboardTotals";
import { useLiveState } from "@/lib/hooks/useLiveState";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";

// Code-only, standalone leaderboard - a second screen (e.g. the host's
// phone) that shows the ranked totals regardless of what `mode` the
// Display route is currently in, handy for the host to privately check or
// rehearse the reveal without it affecting what's on the projector.
function LeaderboardContent({ code }: { code: string }) {
  const quiz = useQuizByCode(code);
  const liveState = useLiveState(quiz?.id);
  const leaderboard = useLeaderboardTotals(quiz?.id);

  if (quiz === undefined) {
    return <CodeGateLoading variant="screen" />;
  }

  if (quiz === null) {
    return <CodeNotFound code={code} variant="screen" />;
  }

  if (liveState === undefined || leaderboard === undefined) {
    return <CodeGateLoading variant="screen" />;
  }

  return (
    <LeaderboardView
      entries={leaderboard}
      revealStage={liveState?.leaderboardRevealStage ?? 3}
    />
  );
}

export default function LeaderboardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-12">
      <LeaderboardContent code={code} />
    </div>
  );
}
