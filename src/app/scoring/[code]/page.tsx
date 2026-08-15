"use client";

import { use, useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { useLongGameResults } from "@/lib/hooks/useLongGameResults";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useRounds } from "@/lib/hooks/useRounds";
import { useScores } from "@/lib/hooks/useScores";
import { useTeams } from "@/lib/hooks/useTeams";
import { clearLongGameResult, markLongGameCorrect, setRoundScore } from "@/lib/scoring";
import type { Round } from "@/lib/types/round";
import type { Team } from "@/lib/types/team";

function TeamScoreRow({
  team,
  quizId,
  selectedRound,
  raw,
  points,
  longGameEnabled,
  isLocked,
  lockedRoundOrder,
  lockedPoints,
  liveRealRoundCount,
}: {
  team: Team;
  quizId: string;
  selectedRound: Round;
  raw: number | undefined;
  points: number | undefined;
  longGameEnabled: boolean;
  isLocked: boolean;
  lockedRoundOrder: number | null | undefined;
  lockedPoints: number | null | undefined;
  liveRealRoundCount: number;
}) {
  const isDoubled = team.doubleRoundPicks.includes(selectedRound.id);

  return (
    <tr className="border-t border-neutral-800">
      <td className="py-2 pr-4 text-neutral-100">
        {team.name} {isDoubled && <span className="ml-1 text-xs text-amber-400">2x</span>}
      </td>
      <td className="py-2 pr-4">
        <input
          type="number"
          key={selectedRound.id}
          defaultValue={raw ?? ""}
          onBlur={(event) => {
            const value = Number(event.target.value) || 0;
            setRoundScore(quizId, selectedRound.id, team.id, value, isDoubled);
          }}
          className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
        />
      </td>
      <td className="py-2 pr-4 text-neutral-400">{points ?? "—"}</td>
      {longGameEnabled && (
        <td className="py-2">
          {isLocked ? (
            <button
              type="button"
              onClick={() => clearLongGameResult(quizId, team.id)}
              className="text-xs text-amber-400 hover:underline"
            >
              ✓ Round {lockedRoundOrder} ({lockedPoints} pts) — undo
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                markLongGameCorrect(quizId, team.id, selectedRound.order, liveRealRoundCount)
              }
              className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
            >
              Mark correct
            </button>
          )}
        </td>
      )}
    </tr>
  );
}

function ScoringContent({ code }: { code: string }) {
  const quiz = useQuizByCode(code);
  const rounds = useRounds(quiz?.id);
  const teams = useTeams(quiz?.id);
  const scores = useScores(quiz?.id);
  const longGameResults = useLongGameResults(quiz?.id);
  const [selectedRoundId, setSelectedRoundId] = useState<string | undefined>(undefined);

  if (
    quiz === undefined ||
    rounds === undefined ||
    teams === undefined ||
    scores === undefined ||
    (quiz?.longGameEnabled && longGameResults === undefined)
  ) {
    return <p className="p-10 text-neutral-400">Loading…</p>;
  }

  if (quiz === null) {
    return <p className="p-10 text-neutral-400">No quiz found for code &quot;{code}&quot;.</p>;
  }

  const realRounds = rounds.filter((round) => !round.isLongGame);
  const selectedRound = realRounds.find((round) => round.id === selectedRoundId) ?? realRounds[0];
  const roundEntries = selectedRound ? (scores[selectedRound.id]?.entries ?? {}) : {};

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-neutral-100">{quiz.title} — Scoring</h1>
      <p className="mb-8 font-mono text-sm text-neutral-500">{quiz.code}</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {realRounds.map((round) => (
          <button
            key={round.id}
            type="button"
            onClick={() => setSelectedRoundId(round.id)}
            className={`rounded border px-3 py-1.5 text-sm ${
              selectedRound?.id === round.id
                ? "border-neutral-100 text-neutral-100"
                : "border-neutral-700 text-neutral-400"
            }`}
          >
            {round.title}
          </button>
        ))}
      </div>

      {selectedRound && teams.length === 0 && (
        <p className="text-neutral-500">No teams yet - add some in Team Setup first.</p>
      )}

      {selectedRound && teams.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-neutral-500">
              <th className="pb-2 font-normal">Team</th>
              <th className="pb-2 font-normal">Raw score</th>
              <th className="pb-2 font-normal">Points</th>
              {quiz.longGameEnabled && <th className="pb-2 font-normal">The Long Game</th>}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const entry = roundEntries[team.id];
              const longGameResult = longGameResults?.[team.id];
              return (
                <TeamScoreRow
                  key={team.id}
                  team={team}
                  quizId={quiz.id}
                  selectedRound={selectedRound}
                  raw={entry?.raw}
                  points={entry?.points}
                  longGameEnabled={quiz.longGameEnabled}
                  isLocked={longGameResult?.correctRoundOrder != null}
                  lockedRoundOrder={longGameResult?.correctRoundOrder}
                  lockedPoints={longGameResult?.pointsAwarded}
                  liveRealRoundCount={realRounds.length}
                />
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ScoringPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return (
    <RequireAuth>
      <ScoringContent code={code} />
    </RequireAuth>
  );
}
