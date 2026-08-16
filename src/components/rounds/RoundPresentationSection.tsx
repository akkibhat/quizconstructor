"use client";

import { useState } from "react";

import { fieldStyles, Label } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { ParsedListField } from "@/components/ui/ParsedListField";
import { cn } from "@/lib/cn";
import { updateRound } from "@/lib/rounds";
import { ROUND_FLAVOUR_INFO, ROUND_FLAVOUR_LABELS } from "@/lib/roundFlavourLabels";
import { type Round, type RoundFlavour } from "@/lib/types/round";

/**
 * Every flavour, each individually expandable, so a host can browse
 * what's on offer before picking one. Whichever flavour is currently
 * selected on the dropdown opens automatically - a quick confirmation of
 * what was just picked - but the host can still click open any other one
 * to compare.
 */
function FlavourGuide({ selected }: { selected: RoundFlavour }) {
  const [openFlavour, setOpenFlavour] = useState<RoundFlavour | null>(selected);
  // Tracks the last flavour this ran for, so a dropdown change can be
  // caught and openFlavour re-synced during render - React's documented
  // way to adjust state from a prop change without the extra render an
  // effect would cost. See useState-in-effect notes elsewhere in this
  // codebase for why an effect is avoided here.
  const [syncedFor, setSyncedFor] = useState(selected);
  if (selected !== syncedFor) {
    setSyncedFor(selected);
    setOpenFlavour(selected);
  }

  return (
    <div className="space-y-1.5">
      <Label>What does each style mean?</Label>
      <div className="space-y-1.5">
        {(Object.keys(ROUND_FLAVOUR_LABELS) as RoundFlavour[]).map((flavour) => {
          const info = ROUND_FLAVOUR_INFO[flavour];
          const isOpen = openFlavour === flavour;
          return (
            <div key={flavour} className="overflow-hidden rounded-chip border border-edge">
              <button
                type="button"
                onClick={() => setOpenFlavour(isOpen ? null : flavour)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors",
                  isOpen ? "text-flame" : "text-ink-soft hover:text-ink"
                )}
              >
                <span className="font-semibold">{ROUND_FLAVOUR_LABELS[flavour]}</span>
                <span aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
              </button>
              {isOpen && (
                <dl className="space-y-2.5 border-t border-edge px-3 py-3 text-xs">
                  <div>
                    <dt className="font-semibold text-ink-soft">What it is</dt>
                    <dd className="mt-0.5 text-ink-muted">{info.description}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-soft">What&apos;s expected</dt>
                    <dd className="mt-0.5 text-ink-muted">{info.expects}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-soft">On the projector</dt>
                    <dd className="mt-0.5 text-ink-muted">{info.projector}</dd>
                  </div>
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The round-wide settings that shape how its questions are presented:
 * what to call them on screen, a rule covering every answer, and a fixed
 * set of values the answers are drawn from.
 *
 * All three are optional and default to off, so a round left alone
 * behaves exactly as rounds always have.
 */
export function RoundPresentationSection({
  quizId,
  roundId,
  round,
}: {
  quizId: string;
  roundId: string;
  round: Round;
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
          question editor below shows - it doesn&apos;t change scoring or the slide order.
        </p>
      </div>

      <div className="border-t border-edge pt-4">
        <FlavourGuide selected={round.flavour} />
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
        <ParsedListField
          id="answerPool"
          label="Answer pool"
          unitLabel="value"
          defaultValue={round.answerPool}
          placeholder={"One per line, e.g.\n17\n42\n156\n1904"}
          rows={6}
          onSave={(parsed) =>
            updateRound(quizId, roundId, { answerPool: parsed.length > 0 ? parsed : null })
          }
        />
        <p className="mt-1.5 text-xs text-ink-muted">
          A fixed set of answers, each used exactly once. Unlike the theme note these stay on
          screen under <em>every</em> question, so teams can weigh up what&apos;s still left.
        </p>
      </div>
    </Panel>
  );
}
