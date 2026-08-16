"use client";

import { use, useState } from "react";

import { CodeGateLoading, CodeNotFound } from "@/components/CodeGateStatus";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, PageHeader, QuizCode, SectionHeading } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldStyles } from "@/components/ui/Field";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useRounds } from "@/lib/hooks/useRounds";
import { useTeams } from "@/lib/hooks/useTeams";
import { addTeam, deleteTeam } from "@/lib/teams";
import { realRoundsOf, type Round } from "@/lib/types/round";
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
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-panel border border-edge bg-surface p-4"
    >
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Team name"
        className={cn(fieldStyles, "text-base")}
      />

      {needsPicks && (
        <div>
          <p className="mb-2.5 text-sm text-ink-muted">
            Pick {picksPerTeam} double-points round{picksPerTeam === 1 ? "" : "s"} —{" "}
            <span
              className={cn(
                "font-semibold tabular-nums",
                picksValid ? "text-flame" : "text-ink-soft"
              )}
            >
              {selectedRoundIds.length}/{picksPerTeam}
            </span>{" "}
            selected
          </p>
          <div className="flex flex-wrap gap-2">
            {realRounds.map((round) => {
              const isSelected = selectedRoundIds.includes(round.id);
              return (
                <button
                  key={round.id}
                  type="button"
                  onClick={() => toggleRound(round.id)}
                  className={cn(
                    "rounded-chip border px-3 py-2 text-sm transition-colors",
                    isSelected
                      ? "border-flame bg-flame font-semibold text-on-flame"
                      : "border-edge-strong text-ink-soft hover:border-flame/60"
                  )}
                >
                  {round.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={!canSubmit} className="w-full sm:w-auto">
        Add Team
      </Button>
    </form>
  );
}

function TeamRow({
  team,
  realRounds,
  quizId,
  confirmDialog,
}: {
  team: Team;
  realRounds: Round[];
  quizId: string;
  confirmDialog: (message: string) => Promise<boolean>;
}) {
  const pickedTitles = team.doubleRoundPicks
    .map((roundId) => realRounds.find((r) => r.id === roundId)?.title)
    .filter((title): title is string => Boolean(title));

  return (
    <Panel as="li" className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-ink">{team.name}</p>
        {pickedTitles.length > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            <Badge tone="flame">2x</Badge>
            {pickedTitles.join(", ")}
          </p>
        )}
      </div>
      <Button
        variant="danger"
        size="sm"
        onClick={async () => {
          if (await confirmDialog(`Remove "${team.name}"?`)) {
            deleteTeam(quizId, team.id);
          }
        }}
      >
        Remove
      </Button>
    </Panel>
  );
}

function TeamSetup({ code }: { code: string }) {
  const quiz = useQuizByCode(code);
  const rounds = useRounds(quiz?.id);
  const teams = useTeams(quiz?.id);
  const { confirmDialog, dialog } = useConfirmDialog();

  if (quiz === undefined || rounds === undefined || teams === undefined) {
    return <CodeGateLoading />;
  }

  if (quiz === null) {
    return <CodeNotFound code={code} />;
  }

  const realRounds = realRoundsOf(rounds);
  const locked = quiz.status !== "setup";

  return (
    <AppShell>
      <PageHeader eyebrow="Teams" title={quiz.title} meta={<QuizCode code={quiz.code} />} />

      {locked ? (
        <p className="mb-6 rounded-panel border border-edge bg-surface px-4 py-3 text-sm text-ink-muted">
          This quiz is {quiz.status === "live" ? "live" : "complete"} - team signup is locked.
        </p>
      ) : (
        <div className="mb-8">
          <AddTeamForm
            quizId={quiz.id}
            realRounds={realRounds}
            picksPerTeam={quiz.doublePointsEnabled ? quiz.doublePointsPicksPerTeam : 0}
          />
        </div>
      )}

      <SectionHeading>Teams ({teams.length})</SectionHeading>

      {teams.length === 0 ? (
        <EmptyState>No teams yet — add the first one above.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {teams.map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              realRounds={realRounds}
              quizId={quiz.id}
              confirmDialog={confirmDialog}
            />
          ))}
        </ul>
      )}

      {dialog}
    </AppShell>
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
