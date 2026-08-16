"use client";

import { LongGameMarker } from "@/components/scoring/LongGameMarking";
import { Badge } from "@/components/ui/Badge";
import { fieldStylesCompact } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { setRoundScore } from "@/lib/scoring";
import type { Round } from "@/lib/types/round";
import type { Team } from "@/lib/types/team";

export function TeamScoreRow({
  team,
  quizId,
  selectedRound,
  // 1-indexed position of selectedRound among sorted real rounds (1st = 1,
  // 2nd = 2, ...) - deliberately NOT selectedRound.order, which is a
  // gapped sort key (10, 20, 30, ...) that would badly wrong the Long
  // Game point formula for any round past the first. See the warning on
  // Round.order.
  roundPosition,
  raw,
  points,
  longGameEnabled,
  longGameMaxPoints,
  isLocked,
  lockedRoundPosition,
  lockedPoints,
  liveRealRoundCount,
}: {
  team: Team;
  quizId: string;
  selectedRound: Round;
  roundPosition: number;
  raw: number | undefined;
  points: number | undefined;
  longGameEnabled: boolean;
  longGameMaxPoints: number;
  isLocked: boolean;
  lockedRoundPosition: number | null | undefined;
  lockedPoints: number | null | undefined;
  liveRealRoundCount: number;
}) {
  const isDoubled = team.doubleRoundPicks.includes(selectedRound.id);

  return (
    <tr className="border-t border-edge">
      <td className="py-2.5 pr-4 text-ink">
        <span className="flex items-center gap-2">
          {team.name} {isDoubled && <Badge tone="flame">2x</Badge>}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <input
          type="number"
          key={selectedRound.id}
          defaultValue={raw ?? ""}
          onBlur={(event) => {
            const value = Number(event.target.value) || 0;
            setRoundScore(quizId, selectedRound.id, team.id, value, isDoubled);
          }}
          className={cn(fieldStylesCompact, "w-20 tabular-nums")}
        />
      </td>
      <td className="font-display py-2.5 pr-4 text-lg font-semibold text-ink-soft tabular-nums">
        {points ?? "—"}
      </td>
      {longGameEnabled && (
        <td className="py-2">
          <LongGameMarker
            quizId={quizId}
            teamId={team.id}
            roundPosition={roundPosition}
            liveRealRoundCount={liveRealRoundCount}
            longGameMaxPoints={longGameMaxPoints}
            isLocked={isLocked}
            lockedRoundPosition={lockedRoundPosition}
            lockedPoints={lockedPoints}
          />
        </td>
      )}
    </tr>
  );
}
