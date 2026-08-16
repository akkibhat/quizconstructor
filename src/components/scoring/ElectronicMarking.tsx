"use client";

import { ChipToggle } from "@/components/ui/ChipToggle";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { setQuestionMark } from "@/lib/electronicScoring";
import { useQuestionMarks } from "@/lib/hooks/useQuestionMarks";
import { useQuestions } from "@/lib/hooks/useQuestions";
import type { Round } from "@/lib/types/round";
import type { Team } from "@/lib/types/team";

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

export function ElectronicScoringPanel({
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
          <ChipToggle
            key={team.id}
            selected={selectedTeamId === team.id}
            onClick={() => setSelectedTeamId(team.id)}
          >
            {team.name}
          </ChipToggle>
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
