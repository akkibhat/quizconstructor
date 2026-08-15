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

  return (
    <div className="w-full max-w-2xl">
      <h1 className="mb-8 text-center text-4xl font-bold text-neutral-100">Leaderboard</h1>
      {entries.length === 0 ? (
        <p className="text-center text-neutral-500">No teams yet.</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, index) => {
            const isRevealed = index >= revealFromIndex;
            return (
              <li
                key={entry.teamId}
                className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-900 px-6 py-3"
              >
                <span className="text-xl text-neutral-100">
                  {index + 1}. {isRevealed ? entry.name : "???"}
                </span>
                <span className="text-xl text-neutral-400">{isRevealed ? entry.total : "—"}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
