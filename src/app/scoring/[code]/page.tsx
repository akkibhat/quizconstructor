"use client";

import { realRoundsOf } from "@/lib/types/round";
import { use, useState } from "react";

import { CodeGateLoading, CodeNotFound } from "@/components/CodeGateStatus";
import { RequireAuth } from "@/components/RequireAuth";
import { ElectronicScoringPanel } from "@/components/scoring/ElectronicMarking";
import { LongGameSection } from "@/components/scoring/LongGameMarking";
import { TeamScoreRow } from "@/components/scoring/TeamScoreRow";
import { AppShell, PageHeader, QuizCode } from "@/components/ui/AppShell";
import { EmptyState } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { useLongGameResults } from "@/lib/hooks/useLongGameResults";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useRounds } from "@/lib/hooks/useRounds";
import { useScores } from "@/lib/hooks/useScores";
import { useTeams } from "@/lib/hooks/useTeams";

/** Whether the host is typing round totals from paper, or marking each question. */
type ScoringMode = "paper" | "electronic";

function ScoringContent({ code }: { code: string }) {
  const quiz = useQuizByCode(code);
  const rounds = useRounds(quiz?.id);
  const teams = useTeams(quiz?.id);
  const scores = useScores(quiz?.id);
  const longGameResults = useLongGameResults(quiz?.id);
  const [selectedRoundId, setSelectedRoundId] = useState<string | undefined>(undefined);
  const [scoringMode, setScoringMode] = useState<ScoringMode>("paper");

  if (
    quiz === undefined ||
    rounds === undefined ||
    teams === undefined ||
    scores === undefined ||
    (quiz?.longGameEnabled && longGameResults === undefined)
  ) {
    return <CodeGateLoading />;
  }

  if (quiz === null) {
    return <CodeNotFound code={code} />;
  }

  const realRounds = realRoundsOf(rounds);
  const selectedRound = realRounds.find((round) => round.id === selectedRoundId) ?? realRounds[0];
  const roundEntries = selectedRound ? (scores[selectedRound.id]?.entries ?? {}) : {};
  const roundPosition = selectedRound ? realRounds.indexOf(selectedRound) + 1 : 0;
  // The Gauntlet has no individual questions to mark electronically - it's
  // always scored as a single raw number (see the note shown below).
  const isElectronicAvailable = selectedRound?.roundType !== "list";
  const effectiveMode: ScoringMode = isElectronicAvailable ? scoringMode : "paper";

  return (
    <AppShell width="wide">
      <PageHeader eyebrow="Scoring" title={quiz.title} meta={<QuizCode code={quiz.code} />} />

      <div className="mb-6 flex flex-wrap gap-2">
        {realRounds.map((round) => (
          <button
            key={round.id}
            type="button"
            onClick={() => setSelectedRoundId(round.id)}
            className={cn(
              "rounded-chip border px-3 py-1.5 text-sm transition-colors",
              selectedRound?.id === round.id
                ? "border-flame bg-flame font-semibold text-on-flame"
                : "border-edge-strong text-ink-muted hover:border-flame/60 hover:text-ink-soft"
            )}
          >
            {round.title}
          </button>
        ))}
      </div>

      {selectedRound?.roundType === "list" && (
        <p className="mb-4 rounded-panel border border-mint/40 bg-mint/8 px-4 py-3 text-sm text-mint">
          The Gauntlet - raw score is however many answers a team got right in a row before their
          first miss (not their total correct count). Always scored as a single number - there
          are no individual questions to mark electronically.
        </p>
      )}

      {selectedRound && teams.length === 0 && (
        <EmptyState>No teams yet — add some in Team Setup first.</EmptyState>
      )}

      {selectedRound && teams.length > 0 && isElectronicAvailable && (
        <div className="mb-6 inline-flex overflow-hidden rounded-chip border border-edge-strong text-sm">
          <button
            type="button"
            onClick={() => setScoringMode("paper")}
            className={cn(
              "px-4 py-2 transition-colors",
              effectiveMode === "paper"
                ? "bg-flame font-semibold text-on-flame"
                : "text-ink-muted hover:text-ink-soft"
            )}
          >
            Paper
          </button>
          <button
            type="button"
            onClick={() => setScoringMode("electronic")}
            className={cn(
              "px-4 py-2 transition-colors",
              effectiveMode === "electronic"
                ? "bg-flame font-semibold text-on-flame"
                : "text-ink-muted hover:text-ink-soft"
            )}
          >
            Electronic
          </button>
        </div>
      )}

      {selectedRound && teams.length > 0 && effectiveMode === "electronic" && (
        <>
          {quiz.longGameEnabled && (
            <LongGameSection
              quizId={quiz.id}
              teams={teams}
              roundPosition={roundPosition}
              liveRealRoundCount={realRounds.length}
              longGameMaxPoints={quiz.longGameMaxPoints}
              longGameResults={longGameResults}
            />
          )}
          <ElectronicScoringPanel quizId={quiz.id} round={selectedRound} teams={teams} />
        </>
      )}

      {selectedRound && teams.length > 0 && effectiveMode === "paper" && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs tracking-widest text-ink-muted uppercase">
              <th className="pb-2 font-semibold">Team</th>
              <th className="pb-2 font-semibold">Raw score</th>
              <th className="pb-2 font-semibold">Points</th>
              {quiz.longGameEnabled && <th className="pb-2 font-semibold">The Long Game</th>}
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
                  roundPosition={roundPosition}
                  raw={entry?.raw}
                  points={entry?.points}
                  longGameEnabled={quiz.longGameEnabled}
                  longGameMaxPoints={quiz.longGameMaxPoints}
                  isLocked={longGameResult?.correctRoundPosition != null}
                  lockedRoundPosition={longGameResult?.correctRoundPosition}
                  lockedPoints={longGameResult?.pointsAwarded}
                  liveRealRoundCount={realRounds.length}
                />
              );
            })}
          </tbody>
        </table>
      )}
    </AppShell>
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
