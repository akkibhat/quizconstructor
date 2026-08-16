"use client";

import { clearLongGameResult, markLongGameCorrect } from "@/lib/scoring";
import type { Team } from "@/lib/types/team";

/**
 * The Long Game "mark correct" / "undo" control for one team on one
 * round. Extracted out of the round-scoring table so it can also be shown
 * in its own section when Electronic scoring mode is active (that mode
 * replaces the table with a per-question view, but Long Game marking
 * isn't part of any round's own questions - it needs to stay reachable
 * either way).
 */
export function LongGameMarker({
  quizId,
  teamId,
  roundPosition,
  liveRealRoundCount,
  longGameMaxPoints,
  isLocked,
  lockedRoundPosition,
  lockedPoints,
}: {
  quizId: string;
  teamId: string;
  roundPosition: number;
  liveRealRoundCount: number;
  longGameMaxPoints: number;
  isLocked: boolean;
  lockedRoundPosition: number | null | undefined;
  lockedPoints: number | null | undefined;
}) {
  if (isLocked) {
    return (
      <button
        type="button"
        onClick={() => clearLongGameResult(quizId, teamId)}
        className="rounded-chip border border-gold bg-gold/85 px-2.5 py-1.5 text-xs font-semibold text-on-flame transition-opacity hover:opacity-80"
      >
        ✓ Round {lockedRoundPosition} · {lockedPoints} pts — undo
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() =>
        markLongGameCorrect(quizId, teamId, roundPosition, liveRealRoundCount, longGameMaxPoints)
      }
      className="rounded-chip border border-edge-strong px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-gold hover:text-gold"
    >
      Mark correct
    </button>
  );
}

export function LongGameSection({
  quizId,
  teams,
  roundPosition,
  liveRealRoundCount,
  longGameMaxPoints,
  longGameResults,
}: {
  quizId: string;
  teams: Team[];
  roundPosition: number;
  liveRealRoundCount: number;
  longGameMaxPoints: number;
  longGameResults: Record<string, { correctRoundPosition: number | null; pointsAwarded: number | null }> | undefined;
}) {
  return (
    <div className="mb-6 rounded-panel border border-gold/40 bg-gold/8 p-4">
      <h3 className="font-display mb-3 text-sm font-semibold tracking-widest text-gold uppercase">
        The Long Game
      </h3>
      <ul className="space-y-2">
        {teams.map((team) => {
          const result = longGameResults?.[team.id];
          return (
            <li key={team.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink">{team.name}</span>
              <LongGameMarker
                quizId={quizId}
                teamId={team.id}
                roundPosition={roundPosition}
                liveRealRoundCount={liveRealRoundCount}
                longGameMaxPoints={longGameMaxPoints}
                isLocked={result?.correctRoundPosition != null}
                lockedRoundPosition={result?.correctRoundPosition}
                lockedPoints={result?.pointsAwarded}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
