"use client";

import { use, useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
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
    <li className="flex items-start justify-between gap-4 rounded border border-neutral-800 bg-neutral-900 p-3">
      <div className="flex-1">
        <p className="text-neutral-100">{question.text}</p>
        <p className="text-sm text-neutral-500">Answer: {question.answer}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => selectBase(0)}
          className={`rounded border px-2 py-1 text-xs ${
            base === 0
              ? "border-red-700 bg-red-950 text-red-300"
              : "border-neutral-700 text-neutral-400"
          }`}
        >
          0
        </button>
        <button
          type="button"
          onClick={() => selectBase(0.5)}
          className={`rounded border px-2 py-1 text-xs ${
            base === 0.5
              ? "border-amber-700 bg-amber-950 text-amber-300"
              : "border-neutral-700 text-neutral-400"
          }`}
        >
          0.5
        </button>
        <button
          type="button"
          onClick={() => selectBase(1)}
          className={`rounded border px-2 py-1 text-xs ${
            base === 1
              ? "border-emerald-700 bg-emerald-950 text-emerald-300"
              : "border-neutral-700 text-neutral-400"
          }`}
        >
          1
        </button>
        <button
          type="button"
          onClick={toggleBonus}
          className={`rounded border px-2 py-1 text-xs ${
            bonusActive
              ? "border-purple-700 bg-purple-950 text-purple-300"
              : "border-neutral-700 text-neutral-400"
          }`}
        >
          Bonus (+{BONUS_AMOUNT})
        </button>
      </div>
    </li>
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
            className={`rounded border px-3 py-1.5 text-sm ${
              selectedTeamId === team.id
                ? "border-neutral-100 text-neutral-100"
                : "border-neutral-700 text-neutral-400"
            }`}
          >
            {team.name}
          </button>
        ))}
      </div>

      {selectedTeam && (
        <>
          <p className="mb-3 text-sm text-neutral-400">
            Marking <span className="text-neutral-100">{selectedTeam.name}</span>
            {selectedTeam.doubleRoundPicks.includes(round.id) && (
              <span className="ml-1 text-xs text-amber-400">2x</span>
            )}{" "}
            - running total: <span className="text-neutral-100">{total}</span>
          </p>

          {questions === undefined || marks === undefined ? (
            <p className="text-neutral-500">Loading…</p>
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
        className="text-xs text-amber-400 hover:underline"
      >
        ✓ Round {lockedRoundPosition} ({lockedPoints} pts) — undo
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() =>
        markLongGameCorrect(quizId, teamId, roundPosition, liveRealRoundCount, longGameMaxPoints)
      }
      className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
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
    <div className="mb-6 rounded border border-amber-900 bg-amber-950/20 p-4">
      <h3 className="mb-3 text-sm font-medium text-amber-300">The Long Game</h3>
      <ul className="space-y-2">
        {teams.map((team) => {
          const result = longGameResults?.[team.id];
          return (
            <li key={team.id} className="flex items-center justify-between text-sm">
              <span className="text-neutral-100">{team.name}</span>
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
    return <p className="p-10 text-neutral-400">Loading…</p>;
  }

  if (quiz === null) {
    return <p className="p-10 text-neutral-400">No quiz found for code &quot;{code}&quot;.</p>;
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

      {selectedRound?.roundType === "list" && (
        <p className="mb-4 rounded border border-sky-900 bg-sky-950/30 px-4 py-2 text-sm text-sky-300">
          The Gauntlet - raw score is however many answers a team got right in a row before their
          first miss (not their total correct count). Always scored as a single number - there
          are no individual questions to mark electronically.
        </p>
      )}

      {selectedRound && teams.length === 0 && (
        <p className="text-neutral-500">No teams yet - add some in Team Setup first.</p>
      )}

      {selectedRound && teams.length > 0 && isElectronicAvailable && (
        <div className="mb-6 inline-flex rounded border border-neutral-700 text-sm">
          <button
            type="button"
            onClick={() => setScoringMode("paper")}
            className={`px-3 py-1.5 ${
              effectiveMode === "paper" ? "bg-neutral-100 text-neutral-900" : "text-neutral-400"
            }`}
          >
            Paper
          </button>
          <button
            type="button"
            onClick={() => setScoringMode("electronic")}
            className={`px-3 py-1.5 ${
              effectiveMode === "electronic" ? "bg-neutral-100 text-neutral-900" : "text-neutral-400"
            }`}
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
