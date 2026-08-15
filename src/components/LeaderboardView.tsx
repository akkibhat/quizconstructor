import { cn } from "@/lib/cn";
import type { LeaderboardEntry } from "@/lib/hooks/useLeaderboardTotals";

/**
 * Ranked team list with a progressive reveal: stage 0 shows nothing,
 * stage 1 reveals the bottom third (worst-ranked teams), stage 2 reveals
 * the bottom two-thirds, stage 3 reveals everyone - stepping through in
 * that order builds suspense toward the winner. Rank numbers are always
 * shown; only the name and score are hidden until a row's reveal stage
 * arrives. Shared by the Display route (in leaderboard mode) and the
 * standalone /leaderboard/[code] route, so both render identically.
 */
export function LeaderboardView({
  entries,
  revealStage,
}: {
  entries: LeaderboardEntry[];
  revealStage: 0 | 1 | 2 | 3;
}) {
  const thirdSize = Math.ceil(entries.length / 3);
  // The lowest array index that's visible at the current stage. Entries
  // are sorted best-first, so higher indices are worse-ranked - stage 1
  // reveals from (length - thirdSize) onward, i.e. just the tail/worst
  // third; stage 3 reveals from index 0, i.e. everyone.
  const revealFromIndex = [entries.length, entries.length - thirdSize, entries.length - thirdSize * 2, 0][
    revealStage
  ];
  // Many venues also give a (smaller) prize for 2nd-to-last, not last -
  // last is excluded deliberately, since deliberately answering everything
  // wrong to "win" it would be a trivial way to cheat.
  const secondToLastIndex = entries.length >= 2 ? entries.length - 2 : -1;

  return (
    <div className="w-full max-w-3xl">
      <h1 className="font-display mb-8 text-center text-6xl font-bold tracking-wide text-ink uppercase">
        Leaderboard
      </h1>

      {entries.length === 0 ? (
        <p className="text-center text-ink-muted">No teams yet.</p>
      ) : (
        <ol className="space-y-2.5">
          {entries.map((entry, index) => {
            const isRevealed = index >= revealFromIndex;
            // The winner only gets the full orange treatment once the
            // top of the board is actually revealed - lighting up row 1
            // while it still reads "???" would give the game away.
            const isWinner = index === 0 && isRevealed;

            return (
              <li
                key={entry.teamId}
                className={cn(
                  "flex items-center gap-5 rounded-panel border px-6 py-4 transition-colors",
                  isWinner
                    ? "border-flame-bright bg-flame edge-dark"
                    : isRevealed
                      ? "border-edge bg-surface"
                      : "border-edge/60 bg-surface/40"
                )}
              >
                <span
                  className={cn(
                    "font-display w-10 shrink-0 text-3xl font-bold tabular-nums",
                    isWinner ? "text-on-flame" : "text-ink-muted"
                  )}
                >
                  {index + 1}
                </span>

                <span
                  className={cn(
                    "flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-2xl",
                    isWinner ? "font-semibold text-on-flame" : "text-ink",
                    !isRevealed && "text-ink-muted"
                  )}
                >
                  {isRevealed ? entry.name : "???"}
                  {isRevealed && index === secondToLastIndex && (
                    <span className="rounded-chip border border-gold/45 px-2 py-0.5 text-xs font-semibold tracking-wide text-gold uppercase">
                      2nd-to-last prize
                    </span>
                  )}
                </span>

                <span
                  className={cn(
                    "font-display shrink-0 text-3xl font-bold tabular-nums",
                    isWinner ? "text-on-flame" : isRevealed ? "text-ink" : "text-ink-muted"
                  )}
                >
                  {isRevealed ? entry.total : "—"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
