"use client";

import { useState } from "react";

import { fieldStyles, Label } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { parseAnswerList } from "@/lib/questionsImportExport";
import { updateRound } from "@/lib/rounds";
import { type Round, ROUND_FLAVOUR_LABELS, type RoundFlavour } from "@/lib/types/round";

export function RoundPresentationSection({
  quizId,
  roundId,
  round,
}: {
  quizId: string;
  roundId: string;
  round: Round;
}) {
  const [poolCount, setPoolCount] = useState(round.answerPool?.length ?? 0);

  return (
    <Panel className="mb-6 space-y-4">
      <h3 className="font-display text-sm font-semibold tracking-widest text-ink uppercase">
        Round style
      </h3>

      <div className="space-y-1.5">
        <Label htmlFor="flavour">Question label</Label>
        <select
          id="flavour"
          value={round.flavour ?? "standard"}
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
          Shown above each question on the projector. Cosmetic only - it doesn&apos;t change
          scoring or the slide order.
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

      <div className="space-y-1.5 border-t border-edge pt-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="answerPool">Answer pool</Label>
          <span className="font-mono text-xs text-flame tabular-nums">
            {poolCount} value{poolCount === 1 ? "" : "s"}
          </span>
        </div>
        <textarea
          id="answerPool"
          defaultValue={(round.answerPool ?? []).join("\n")}
          placeholder={"One per line, e.g.\n17\n42\n156\n1904"}
          onChange={(event) => setPoolCount(parseAnswerList(event.target.value).length)}
          onBlur={(event) => {
            const parsed = parseAnswerList(event.target.value);
            event.target.value = parsed.join("\n");
            setPoolCount(parsed.length);
            updateRound(quizId, roundId, { answerPool: parsed.length > 0 ? parsed : null });
          }}
          className={cn(fieldStyles, "font-mono text-sm")}
          rows={6}
        />
        <p className="text-xs text-ink-muted">
          A fixed set of answers, each used exactly once. Unlike the theme note these stay on
          screen under <em>every</em> question, so teams can weigh up what&apos;s still left.
        </p>
      </div>
    </Panel>
  );
}
