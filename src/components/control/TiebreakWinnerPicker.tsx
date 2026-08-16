"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { Team } from "@/lib/types/team";

/**
 * Manual mode: the host judges from paper and taps the winning team, then
 * can declare a dead heat if the paper answers don't split them either.
 * Presentational only, same as TiebreakGuessList.
 */
export function TiebreakWinnerPicker({
  contestedTeams,
  winnerId,
  revealed,
  onPick,
  onReveal,
  onDeclareDeadHeat,
  isSaving,
  followUpsAvailable,
}: {
  contestedTeams: Team[];
  winnerId: string | null;
  revealed: boolean;
  onPick: (teamId: string) => void;
  onReveal: () => void;
  onDeclareDeadHeat: () => void;
  isSaving: boolean;
  followUpsAvailable: number;
}) {
  return (
    <div>
      {revealed && <p className="mb-3 text-sm text-ink-muted">Tap whoever came closest:</p>}

      <div className="space-y-2">
        {contestedTeams.map((team) => {
          const isWinner = winnerId === team.id;
          return (
            <button
              key={team.id}
              type="button"
              disabled={!revealed}
              onClick={() => onPick(team.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-panel border p-3 text-left transition-colors",
                isWinner
                  ? "border-flame bg-flame/15"
                  : "border-edge bg-surface enabled:hover:border-flame/60",
                !revealed && "cursor-default opacity-70"
              )}
            >
              <span className="text-ink">{team.name}</span>
              {isWinner && <Badge tone="flame">Winner</Badge>}
            </button>
          );
        })}
      </div>

      {!revealed ? (
        <Button variant="primary" size="lg" className="mt-4" onClick={onReveal}>
          Reveal Answer
        </Button>
      ) : (
        <div className="mt-4">
          <Button
            variant="danger"
            disabled={followUpsAvailable === 0 || isSaving}
            onClick={onDeclareDeadHeat}
          >
            {isSaving ? "Starting…" : "Dead heat — run another question"}
          </Button>
          <p className="mt-2 text-xs text-ink-muted">
            {followUpsAvailable > 0
              ? `Can't split them? This pulls a fresh question and runs it between the same teams. ${followUpsAvailable} unused question${followUpsAvailable === 1 ? "" : "s"} left.`
              : "No unused questions left in the bank to run a decider with."}
          </p>
        </div>
      )}
    </div>
  );
}
