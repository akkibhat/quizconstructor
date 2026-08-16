"use client";

import { Badge } from "@/components/ui/Badge";
import { fieldStyles, Label } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { deriveAnswerPool, duplicateAnswers } from "@/lib/answerPool";
import { updateRound } from "@/lib/rounds";
import { ROUND_FLAVOUR_LABELS } from "@/lib/roundFlavourLabels";
import type { Question } from "@/lib/types/question";
import { type Round, type RoundFlavour } from "@/lib/types/round";

/**
 * A read-only preview of the round's answer pool - derived live from the
 * questions below, not typed separately. Warns about duplicate answers,
 * since the pool mechanic assumes every value is claimed by exactly one
 * question.
 */
function AnswerPoolPreview({ questions }: { questions: Question[] }) {
  const pool = deriveAnswerPool(questions);
  const duplicates = duplicateAnswers(questions);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Label>Answer pool</Label>
          <Badge>Auto</Badge>
        </span>
        <span className="font-mono text-xs text-flame tabular-nums">
          {pool.length} value{pool.length === 1 ? "" : "s"}
        </span>
      </div>

      {pool.length === 0 ? (
        <p className="rounded-chip border border-dashed border-edge px-3 py-2 text-xs text-ink-muted">
          Fill in answers below and they&apos;ll appear here automatically.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {pool.map((value, index) => (
            <span
              key={index}
              className="rounded-chip border border-edge-strong px-2 py-1 text-xs text-ink-soft"
            >
              {value}
            </span>
          ))}
        </div>
      )}

      {duplicates.length > 0 && (
        <p className="rounded-chip border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          Repeated answer{duplicates.length === 1 ? "" : "s"}: {duplicates.join(", ")} - each
          pool value should belong to exactly one question.
        </p>
      )}

      <p className="text-xs text-ink-muted">
        Every answered question&apos;s answer, each used once. Stays on screen under{" "}
        <em>every</em> question so teams can weigh up what&apos;s still left - always matches the
        questions below, since there&apos;s nothing separate to keep in sync.
      </p>
    </div>
  );
}

/**
 * The round-wide settings that shape how its questions are presented:
 * what to call them on screen, a rule covering every answer, and a
 * preview of the pool of answers those questions draw from.
 *
 * All are optional and default to off, so a round left alone behaves
 * exactly as rounds always have.
 */
export function RoundPresentationSection({
  quizId,
  roundId,
  round,
  questions,
}: {
  quizId: string;
  roundId: string;
  round: Round;
  questions: Question[];
}) {
  return (
    <Panel className="mb-6 space-y-4">
      <h3 className="font-display text-sm font-semibold tracking-widest text-ink uppercase">
        Round style
      </h3>

      <div className="space-y-1.5">
        <Label htmlFor="flavour">Question label</Label>
        <select
          id="flavour"
          value={round.flavour}
          onChange={(event) =>
            updateRound(quizId, roundId, { flavour: event.target.value as RoundFlavour })
          }
          className={fieldStyles}
        >
          {(Object.keys(ROUND_FLAVOUR_LABELS) as RoundFlavour[]).map((flavour) => (
            <option key={flavour} value={flavour}>
              {ROUND_FLAVOUR_LABELS[flavour]}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-muted">
          Sets what&apos;s shown above each question on the projector, and which fields the
          question editor below shows - it doesn&apos;t change scoring or the slide order. See
          the Round types panel for what each one means.
        </p>
      </div>

      <div className="space-y-1.5 border-t border-edge pt-4">
        <Label htmlFor="themeNote">Theme note</Label>
        <input
          id="themeNote"
          defaultValue={round.themeNote ?? ""}
          placeholder="e.g. Every answer begins with S"
          onBlur={(event) =>
            updateRound(quizId, roundId, { themeNote: event.target.value.trim() || null })
          }
          className={fieldStyles}
        />
        <p className="text-xs text-ink-muted">
          A rule covering the whole round, shown once on its title slide.
        </p>
      </div>

      <div className="border-t border-edge pt-4">
        <AnswerPoolPreview questions={questions} />
      </div>
    </Panel>
  );
}
