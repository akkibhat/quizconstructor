import { cn } from "@/lib/cn";
import type { LeaderboardEntry } from "@/lib/hooks/useLeaderboardTotals";
import { teamsAwaitingTiebreak } from "@/lib/tieDetection";

/**
 * The podium fills for 1st, 2nd and 3rd. Filling the whole row rather
 * than adding a badge is the point: it reads from the back of a room
 * without anyone having to read anything, which a small chip wouldn't.
 *
 * All three carry the same near-black text, so the row's own colour is
 * the only thing that changes between them.
 */
const MEDAL_ROWS = [
  "border-gold bg-gold edge-dark",
  "border-silver bg-silver edge-dark",
  "border-bronze bg-bronze edge-dark",
];

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

  // Teams whose position is tied and hasn't been settled by a tiebreak
  // yet. Their row order is arbitrary until then, so awarding anything
  // off the back of it would be announcing a winner that hasn't been
  // decided - the badges below hold back until the tiebreak has run.
  const awaitingTiebreak = teamsAwaitingTiebreak(entries);

  // When a tie for the prize has been settled, the badge follows the team
  // that won the tiebreak rather than whoever happens to sit in the
  // 2nd-to-last row - a bottom tiebreak deliberately doesn't reorder the
  // board, since the badge is the whole outcome. Ignored if that team is
  // no longer on the 2nd-to-last score, which means scoring has moved on
  // since and the stored result is stale.
  const prizeWinner = entries.find(
    (entry) => entry.tiebreak?.position === "second-to-last" && entry.tiebreak.rank === 0
  );
  const prizeWinnerId =
    prizeWinner && secondToLastIndex >= 0 && prizeWinner.total === entries[secondToLastIndex].total
      ? prizeWinner.teamId
      : null;

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
            const isPending = awaitingTiebreak.has(entry.teamId);

            // A medal only lands once the row is actually revealed -
            // lighting up 1st while it still reads "???" would give the
            // game away - and only once any tie for that spot has been
            // settled, since until then the order is arbitrary.
            const medal = isRevealed && !isPending ? MEDAL_ROWS[index] : undefined;

            // With no tiebreak in play the prize just goes to whoever is
            // 2nd from the bottom; once one has been settled it follows
            // the team that won it instead.
            const holdsPrize = prizeWinnerId
              ? entry.teamId === prizeWinnerId
              : index === secondToLastIndex;
            const showSecondToLastPrize = isRevealed && holdsPrize && !isPending;

            return (
              <li
                key={entry.teamId}
                className={cn(
                  "flex items-center gap-5 rounded-panel border px-6 py-4 transition-colors",
                  medal ?? (isRevealed ? "border-edge bg-surface" : "border-edge/60 bg-surface/40")
                )}
              >
                <span
                  className={cn(
                    "font-display w-10 shrink-0 text-3xl font-bold tabular-nums",
                    medal ? "text-on-flame" : "text-ink-muted"
                  )}
                >
                  {index + 1}
                </span>

                <span
                  className={cn(
                    "flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-2xl",
                    medal ? "font-semibold text-on-flame" : "text-ink",
                    !isRevealed && "text-ink-muted"
                  )}
                >
                  {isRevealed ? entry.name : "???"}
                  {showSecondToLastPrize && (
                    <span
                      className={cn(
                        "rounded-chip border px-2 py-0.5 text-xs font-semibold tracking-wide uppercase",
                        // Mint rather than gold now that gold is 1st
                        // place - two gold badges meaning unrelated
                        // things would read as connected.
                        medal ? "border-on-flame/40 text-on-flame" : "border-mint/50 text-mint"
                      )}
                    >
                      2nd-to-last prize
                    </span>
                  )}
                  {isRevealed && isPending && (
                    <span className="rounded-chip border border-flame px-2 py-0.5 text-xs font-semibold tracking-wide text-flame uppercase">
                      Tiebreak pending
                    </span>
                  )}
                </span>

                <span
                  className={cn(
                    "font-display shrink-0 text-3xl font-bold tabular-nums",
                    medal ? "text-on-flame" : isRevealed ? "text-ink" : "text-ink-muted"
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
