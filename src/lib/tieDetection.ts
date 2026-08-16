import type { LeaderboardEntry } from "@/lib/hooks/useLeaderboardTotals";
import type { ContestedPosition } from "@/lib/types/liveState";

export interface TieGroup {
  position: ContestedPosition;
  score: number;
  teams: LeaderboardEntry[];
}

/**
 * Finds ties that actually matter for a prize: at the top (1st/2nd/3rd -
 * a tied score whose rank range touches any of those three positions) or
 * at 2nd-to-last specifically (not last - see the note on the
 * "2nd-to-last prize" badge in LeaderboardView for why last is excluded).
 * Ordinary mid-table ties are ignored, since nothing depends on them.
 *
 * `entries` must be sorted highest-first, as useLeaderboardTotals
 * returns it. In a very small quiz one run of tied teams can come back
 * as both a "top" and a "second-to-last" group - that's intended.
 */
export function detectTiedPositions(entries: LeaderboardEntry[]): TieGroup[] {
  if (entries.length < 2) {
    return [];
  }

  const secondToLastIndex = entries.length - 2;
  const groups: TieGroup[] = [];

  let start = 0;
  while (start < entries.length) {
    let end = start;
    while (end + 1 < entries.length && entries[end + 1].total === entries[start].total) {
      end++;
    }

    // A real tie is 2+ teams sharing a score - a group of exactly one
    // isn't a tie at all.
    if (end > start) {
      const teams = entries.slice(start, end + 1);
      if (start <= 2) {
        groups.push({ position: "top", score: entries[start].total, teams });
      }
      if (start <= secondToLastIndex && end >= secondToLastIndex) {
        groups.push({ position: "second-to-last", score: entries[start].total, teams });
      }
    }

    start = end + 1;
  }

  return groups;
}

/**
 * A tie group counts as settled once every team in it carries a tiebreak
 * placing - at that point the leaderboard sort has put them in a real
 * order and the prize badges mean something. Until then the group is
 * still outstanding.
 */
function isTieGroupResolved(group: TieGroup): boolean {
  return group.teams.every((team) => team.tiebreak !== null);
}

/**
 * The tie groups that still need a tiebreak run. This is what both the
 * Controller's alert banner and the leaderboard's "Tiebreak" badges key
 * off, so the two never disagree about whether something is outstanding.
 */
export function unresolvedTieGroups(entries: LeaderboardEntry[]): TieGroup[] {
  return detectTiedPositions(entries).filter((group) => !isTieGroupResolved(group));
}

/**
 * Every team still waiting on a tiebreak, as a lookup. The leaderboard
 * uses this to badge those rows and to hold back the winner styling and
 * the 2nd-to-last prize until the position is actually settled.
 */
export function teamsAwaitingTiebreak(entries: LeaderboardEntry[]): Set<string> {
  const pending = new Set<string>();
  for (const group of unresolvedTieGroups(entries)) {
    for (const team of group.teams) {
      pending.add(team.teamId);
    }
  }
  return pending;
}

/** In app-computes mode, whichever tied team's guess is numerically closest to the correct answer wins. */
export function computeTiebreakWinner(
  correctAnswer: number,
  guesses: Record<string, number>
): string | null {
  let winnerId: string | null = null;
  let smallestDistance = Infinity;
  for (const [teamId, guess] of Object.entries(guesses)) {
    const distance = Math.abs(guess - correctAnswer);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      winnerId = teamId;
    }
  }
  return winnerId;
}
