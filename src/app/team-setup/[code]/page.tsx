"use client";

import { use, useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useRounds } from "@/lib/hooks/useRounds";
import { useTeams } from "@/lib/hooks/useTeams";
import { addTeam, deleteTeam } from "@/lib/teams";
import type { Round } from "@/lib/types/round";
import type { Team } from "@/lib/types/team";

function AddTeamForm({
  quizId,
  realRounds,
  picksPerTeam,
}: {
  quizId: string;
  realRounds: Round[];
  picksPerTeam: number;
}) {
  const [name, setName] = useState("");
  const [selectedRoundIds, setSelectedRoundIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsPicks = picksPerTeam > 0;
  const picksValid = !needsPicks || selectedRoundIds.length === picksPerTeam;
  const canSubmit = name.trim().length > 0 && picksValid && !isSubmitting;

  function toggleRound(roundId: string) {
    setSelectedRoundIds((current) => {
      if (current.includes(roundId)) {
        return current.filter((id) => id !== roundId);
      }
      if (current.length >= picksPerTeam) {
        // Already at the limit - drop the oldest pick to make room, so
        // clicking a new round always does something instead of silently
        // failing once picksPerTeam is reached.
        return [...current.slice(1), roundId];
      }
      return [...current, roundId];
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await addTeam(quizId, name.trim(), needsPicks ? selectedRoundIds : []);
      setName("");
      setSelectedRoundIds([]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border border-neutral-800 bg-neutral-900 p-4">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Team name"
        className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
      />

      {needsPicks && (
        <div>
          <p className="mb-2 text-sm text-neutral-400">
            Pick {picksPerTeam} double-points round{picksPerTeam === 1 ? "" : "s"} (
            {selectedRoundIds.length}/{picksPerTeam} selected)
          </p>
          <div className="flex flex-wrap gap-2">
            {realRounds.map((round) => {
              const isSelected = selectedRoundIds.includes(round.id);
              return (
                <button
                  key={round.id}
                  type="button"
                  onClick={() => toggleRound(round.id)}
                  className={`rounded border px-3 py-1.5 text-sm ${
                    isSelected
                      ? "border-amber-500 bg-amber-950/40 text-amber-300"
                      : "border-neutral-700 text-neutral-300"
                  }`}
                >
                  {round.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded bg-neutral-100 px-4 py-2 font-medium text-neutral-900 disabled:opacity-50"
      >
        Add Team
      </button>
    </form>
  );
}

function TeamRow({
  team,
  realRounds,
  quizId,
}: {
  team: Team;
  realRounds: Round[];
  quizId: string;
}) {
  const pickedTitles = team.doubleRoundPicks
    .map((roundId) => realRounds.find((r) => r.id === roundId)?.title)
    .filter((title): title is string => Boolean(title));

  return (
    <li className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-900 px-4 py-3">
      <div>
        <p className="text-neutral-100">{team.name}</p>
        {pickedTitles.length > 0 && (
          <p className="text-xs text-neutral-500">Double: {pickedTitles.join(", ")}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          if (confirm(`Remove "${team.name}"?`)) {
            deleteTeam(quizId, team.id);
          }
        }}
        className="rounded border border-red-900 px-2 py-1 text-xs text-red-400"
      >
        Remove
      </button>
    </li>
  );
}

function TeamSetup({ code }: { code: string }) {
  const quiz = useQuizByCode(code);
  const rounds = useRounds(quiz?.id);
  const teams = useTeams(quiz?.id);

  if (quiz === undefined || rounds === undefined || teams === undefined) {
    return <p className="p-10 text-neutral-400">Loading…</p>;
  }

  if (quiz === null) {
    return <p className="p-10 text-neutral-400">No quiz found for code &quot;{code}&quot;.</p>;
  }

  const realRounds = rounds.filter((r) => !r.isLongGame);
  const locked = quiz.status !== "setup";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-neutral-100">{quiz.title} — Teams</h1>
      <p className="mb-8 font-mono text-sm text-neutral-500">{quiz.code}</p>

      {locked ? (
        <p className="mb-6 rounded border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
          This quiz is {quiz.status === "live" ? "live" : "complete"} - team signup is locked.
        </p>
      ) : (
        <div className="mb-6">
          <AddTeamForm
            quizId={quiz.id}
            realRounds={realRounds}
            picksPerTeam={quiz.doublePointsEnabled ? quiz.doublePointsPicksPerTeam : 0}
          />
        </div>
      )}

      <h2 className="mb-3 text-lg font-medium text-neutral-100">Teams ({teams.length})</h2>
      <ul className="space-y-2">
        {teams.map((team) => (
          <TeamRow key={team.id} team={team} realRounds={realRounds} quizId={quiz.id} />
        ))}
      </ul>
    </div>
  );
}

export default function TeamSetupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return (
    <RequireAuth>
      <TeamSetup code={code} />
    </RequireAuth>
  );
}
