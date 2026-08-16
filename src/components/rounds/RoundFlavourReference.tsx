"use client";

import { useState } from "react";

import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { ROUND_FLAVOUR_INFO, ROUND_FLAVOUR_LABELS } from "@/lib/roundFlavourLabels";
import { type RoundFlavour } from "@/lib/types/round";

/**
 * A sticky sidebar reference: every flavour, each individually
 * expandable, so a host can browse what's on offer before picking one -
 * lives outside the round-editing column entirely, since a full
 * seven-entry reference is too much to sit inline in the settings panel
 * every time.
 *
 * Whichever flavour is currently selected on the dropdown opens
 * automatically, as a quick confirmation of what was just picked; the
 * host can still click open any other one to compare.
 */
export function RoundFlavourReference({ selected }: { selected: RoundFlavour }) {
  const [openFlavour, setOpenFlavour] = useState<RoundFlavour | null>(selected);
  // Tracks the last flavour this ran for, so a dropdown change can be
  // caught and openFlavour re-synced during render - React's documented
  // way to adjust state from a prop change without the extra render an
  // effect would cost.
  const [syncedFor, setSyncedFor] = useState(selected);
  if (selected !== syncedFor) {
    setSyncedFor(selected);
    setOpenFlavour(selected);
  }

  return (
    <Panel className="space-y-3 lg:sticky lg:top-20">
      <div>
        <h3 className="font-display text-sm font-semibold tracking-widest text-ink uppercase">
          Round types
        </h3>
        <p className="mt-1 text-xs text-ink-muted">Tap a style to see what it means.</p>
      </div>

      <div className="space-y-1.5">
        {(Object.keys(ROUND_FLAVOUR_LABELS) as RoundFlavour[]).map((flavour) => {
          const info = ROUND_FLAVOUR_INFO[flavour];
          const isOpen = openFlavour === flavour;
          const isSelected = selected === flavour;
          return (
            <div
              key={flavour}
              className={cn(
                "overflow-hidden rounded-chip border",
                isSelected ? "border-flame/50" : "border-edge"
              )}
            >
              <button
                type="button"
                onClick={() => setOpenFlavour(isOpen ? null : flavour)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors",
                  isOpen ? "text-flame" : "text-ink-soft hover:text-ink"
                )}
              >
                <span className="flex items-center gap-2 font-semibold">
                  {ROUND_FLAVOUR_LABELS[flavour]}
                  {isSelected && (
                    <span className="rounded-chip bg-flame/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-flame uppercase">
                      Current
                    </span>
                  )}
                </span>
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
    </Panel>
  );
}
