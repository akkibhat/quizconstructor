"use client";

import { use, useState } from "react";

import { CodeGateLoading, CodeNotFound } from "@/components/CodeGateStatus";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, PageHeader, QuizCode } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/Badge";
import { fieldStylesCompact } from "@/components/ui/Field";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { setQuestionMark } from "@/lib/electronicScoring";
import { useLongGameResults } from "@/lib/hooks/useLongGameResults";
import { useQuestionMarks } from "@/lib/hooks/useQuestionMarks";
import { useQuestions } from "@/lib/hooks/useQuestions";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useRounds } from "@/lib/hooks/useRounds";
import { useScores } from "@/lib/hooks/useScores";
import { useTeams } from "@/lib/hooks/useTeams";
import { clearLongGameResult, markLongGameCorrect, setRoundScore } from "@/lib/scoring";
import type { Round } from "@/lib/types/round";
import type { Team } from "@/lib/types/team";

type ScoringMode = "paper" | "electronic";

const BONUS_AMOUNT = 1;

// Colour is doing real work in the marking row - the host is clicking
// these dozens of times a night and needs to see at a glance which one
// is set, without reading it. Each tone keeps a fixed meaning: red for
// nothing awarded, gold for half credit, green for full, orange for the
// bonus.
const MARK_TONES = {
  danger: "border-danger bg-danger/85 text-ink",
  gold: "border-gold bg-gold/85 text-on-flame",
  success: "border-success bg-success/85 text-on-flame",
  flame: "border-flame bg-flame text-on-flame",
} as const;

/** One toggle in a question's marking row - see MARK_TONES above. */
function MarkButton({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: keyof typeof MARK_TONES;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-9 rounded-chip border px-2.5 py-1.5 text-xs font-semibold transition-colors",
        active
          ? MARK_TONES[tone]
          : "border-edge-strong text-ink-muted hover:border-ink-muted hover:text-ink-soft"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Reconstructs the "0 / 0.5 / 1 base" and "bonus on/off" button states
 * from a single stored total, since the total is all that's persisted -
 * there's no separate stored flag for "was the bonus button clicked".
 * `1` is treated as "base 1, no bonus" rather than "base 0, bonus" since
 * that's the far more common way to reach exactly 1; totals above 1 can
 * only be explained by the bonus being active, so those decompose
 * unambiguously.
 */
function inferBaseAndBonus(awarded: number | undefined): {
  base: 0 | 0.5 | 1 | null;
  bonusActive: boolean;
} {
  if (awarded === undefined) return { base: null, bonusActive: false };
  if (awarded === 1) return { base: 1, bonusActive: false };
  if (awarded === 0.5) return { base: 0.5, bonusActive: false };
  if (awarded >= 1 + BONUS_AMOUNT) return { base: 1, bonusActive: true };
  if (awarded === 0.5 + BONUS_AMOUNT) return { base: 0.5, bonusActive: true };
  return { base: 0, bonusActive: false };
}

/**
 * Marking for one question, for one team: a fixed 0 / 0.5 / 1 base score,
 * plus an independent Bonus toggle that adds on top of whichever base is
 * selected (rather than being another alternative in the same group) -
 * covers the "90% of the time it's 1 point, sometimes half credit for a
 * two-part answer, rarely a bonus point" marking pattern in one row.
 * Awarding immediately recomputes and writes that team's round total -
 * see setQuestionMark in lib/electronicScoring.ts.
 */
function QuestionMarkRow({
  quizId,
  roundId,
  teamId,
  question,
  currentMarks,
  isDoubled,
}: {
  quizId: string;
  roundId: string;
  teamId: string;
  question: { id: string; text: string; answer: string };
  currentMarks: Record<string, number>;
  isDoubled: boolean;
}) {
  const awarded = currentMarks[question.id];
  const { base, bonusActive } = inferBaseAndBonus(awarded);

  function mark(points: number) {
    setQuestionMark(quizId, roundId, teamId, question.id, points, currentMarks, isDoubled);
  }

  function selectBase(newBase: 0 | 0.5 | 1) {
    mark(newBase + (bonusActive ? BONUS_AMOUNT : 0));
  }

  function toggleBonus() {
    mark((base ?? 0) + (bonusActive ? 0 : BONUS_AMOUNT));
  }

  return (
    <Panel as="li" className="flex flex-wrap items-start justify-between gap-3 p-3">
      <div className="min-w-[12rem] flex-1">
        <p className="text-ink">{question.text}</p>
        <p className="mt-0.5 text-sm text-ink-muted">Answer: {question.answer}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <MarkButton active={base === 0} tone="danger" onClick={() => selectBase(0)}>
          0
        </MarkButton>
        <MarkButton active={base === 0.5} tone="gold" onClick={() => selectBase(0.5)}>
          ½
        </MarkButton>
        <MarkButton active={base === 1} tone="success" onClick={() => selectBase(1)}>
          1
        </MarkButton>
        <MarkButton active={bonusActive} tone="flame" onClick={toggleBonus}>
          Bonus +{BONUS_AMOUNT}
        </MarkButton>
      </div>
    </Panel>
  );
}

function ElectronicScoringPanel({
  quizId,
  round,
  teams,
}: {
  quizId: string;
  round: Round;
  teams: Team[];
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(teams[0]?.id);
  const questions = useQuestions(quizId, round.id);
  const marks = useQuestionMarks(quizId, round.id, selectedTeamId);
  const selectedTeam = teams.find((team) => team.id === selectedTeamId);

  const total = marks ? Object.values(marks).reduce((sum, points) => sum + points, 0) : 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            onClick={() => setSelectedTeamId(team.id)}
            className={cn(
              "rounded-chip border px-3 py-1.5 text-sm transition-colors",
              selectedTeamId === team.id
                ? "border-flame bg-flame font-semibold text-on-flame"
                : "border-edge-strong text-ink-muted hover:border-flame/60 hover:text-ink-soft"
            )}
          >
            {team.name}
          </button>
        ))}
      </div>

      {selectedTeam && (
        <>
          <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            Marking <span className="font-semibold text-ink">{selectedTeam.name}</span>
            {selectedTeam.doubleRoundPicks.includes(round.id) && <Badge tone="flame">2x</Badge>}
            <span className="text-ink-muted">— running total:</span>
            <span className="font-display text-lg font-bold text-flame tabular-nums">{total}</span>
          </p>

          {questions === undefined || marks === undefined ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : (
            <ul className="space-y-2">
              {questions.map((question) => (
                <QuestionMarkRow
                  key={question.id}
                  quizId={quizId}
                  roundId={round.id}
                  teamId={selectedTeam.id}
                  question={question}
                  currentMarks={marks}
                  isDoubled={selectedTeam.doubleRoundPicks.includes(round.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function TeamScoreRow({
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

/**
 * The Long Game "mark correct" / "undo" control for one team on one
 * round. Extracted out of the round-scoring table so it can also be shown
 * in its own section when Electronic scoring mode is active (that mode
 * replaces the table with a per-question view, but Long Game marking
 * isn't part of any round's own questions - it needs to stay reachable
 * either way).
 */
function LongGameMarker({
  quizId,
  teamId,
  roundPosition,
  liveRealRoundCount,
  longGameMaxPoints,
  isLocked,
  lockedRoundPosition,
  lockedPoints,
}: {
  quizId: string;
  teamId: string;
  roundPosition: number;
  liveRealRoundCount: number;
  longGameMaxPoints: number;
  isLocked: boolean;
  lockedRoundPosition: number | null | undefined;
  lockedPoints: number | null | undefined;
}) {
  if (isLocked) {
    return (
      <button
        type="button"
        onClick={() => clearLongGameResult(quizId, teamId)}
        className="rounded-chip border border-gold bg-gold/85 px-2.5 py-1.5 text-xs font-semibold text-on-flame transition-opacity hover:opacity-80"
      >
        ✓ Round {lockedRoundPosition} · {lockedPoints} pts — undo
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() =>
        markLongGameCorrect(quizId, teamId, roundPosition, liveRealRoundCount, longGameMaxPoints)
      }
      className="rounded-chip border border-edge-strong px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-gold hover:text-gold"
    >
      Mark correct
    </button>
  );
}

function LongGameSection({
  quizId,
  teams,
  roundPosition,
  liveRealRoundCount,
  longGameMaxPoints,
  longGameResults,
}: {
  quizId: string;
  teams: Team[];
  roundPosition: number;
  liveRealRoundCount: number;
  longGameMaxPoints: number;
  longGameResults: Record<string, { correctRoundPosition: number | null; pointsAwarded: number | null }> | undefined;
}) {
  return (
    <div className="mb-6 rounded-panel border border-gold/40 bg-gold/8 p-4">
      <h3 className="font-display mb-3 text-sm font-semibold tracking-widest text-gold uppercase">
        The Long Game
      </h3>
      <ul className="space-y-2">
        {teams.map((team) => {
          const result = longGameResults?.[team.id];
          return (
            <li key={team.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink">{team.name}</span>
              <LongGameMarker
                quizId={quizId}
                teamId={team.id}
                roundPosition={roundPosition}
                liveRealRoundCount={liveRealRoundCount}
                longGameMaxPoints={longGameMaxPoints}
                isLocked={result?.correctRoundPosition != null}
                lockedRoundPosition={result?.correctRoundPosition}
                lockedPoints={result?.pointsAwarded}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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

  const realRounds = rounds.filter((round) => !round.isLongGame);
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
