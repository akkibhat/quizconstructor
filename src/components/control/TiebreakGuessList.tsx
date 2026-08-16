"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldStylesCompact } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import type { Team } from "@/lib/types/team";

/**
 * App-computes mode: a guess box per contested team, with the running
 * distance and Winner/Level markers once revealed. Purely presentational
 * - every value it needs is computed by TiebreakPanel and handed in, so
 * this has no idea how a dead heat is detected or a result gets recorded.
 */
export function TiebreakGuessList({
  contestedTeams,
  guesses,
  levelTeamIds,
  winnerId,
  revealed,
  correctAnswer,
  onGuessChange,
  onReveal,
}: {
  contestedTeams: Team[];
  guesses: Record<string, number>;
  levelTeamIds: Set<string>;
  winnerId: string | null;
  revealed: boolean;
  correctAnswer: number;
  onGuessChange: (teamId: string, value: string) => void;
  onReveal: () => void;
}) {
  return (
    <div className="space-y-2">
      {contestedTeams.map((team) => {
        const isLevel = levelTeamIds.has(team.id);
        const isWinner = winnerId === team.id && !isLevel;
        const guess = guesses[team.id];
        const distance = revealed && guess !== undefined ? Math.abs(guess - correctAnswer) : null;

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
              value={guess ?? ""}
              onChange={(event) => onGuessChange(team.id, event.target.value)}
              className={cn(fieldStylesCompact, "w-32 tabular-nums")}
              placeholder="Guess"
            />
          </div>
        );
      })}
      {!revealed && (
        <Button variant="primary" size="lg" className="mt-2" onClick={onReveal}>
          Reveal Winner
        </Button>
      )}
    </div>
  );
}
