"use client";

import { useEffect, useMemo, useState } from "react";

import { SlideView } from "@/components/SlideView";
import { Button } from "@/components/ui/Button";
import { ScreenFrame } from "@/components/ui/ScreenFrame";
import { buildSlideList } from "@/lib/slides/buildSlideList";
import type { Question } from "@/lib/types/question";
import type { Round } from "@/lib/types/round";

/**
 * Read-only walk-through of exactly what this round will look like on the
 * projector - built by calling buildSlideList with just this one round, so
 * it's the same function Display and Controller use rather than a second
 * approximation of it. Works whether or not the quiz is live, since it
 * never touches liveState.
 */
export function RoundPreviewModal({
  round,
  questions,
  onClose,
}: {
  round: Round;
  questions: Question[];
  onClose: () => void;
}) {
  const slides = useMemo(
    () => buildSlideList([round], { [round.id]: questions }, false, [], ""),
    [round, questions]
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") setIndex((i) => Math.min(i + 1, slides.length - 1));
      else if (event.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, slides.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-panel border border-edge-strong bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">Preview — {round.title}</h2>
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <ScreenFrame className="mb-4 flex min-h-[260px] items-center justify-center overflow-hidden p-8">
          <div className="origin-center scale-[0.55]">
            <SlideView slide={slides[index]} />
          </div>
        </ScreenFrame>

        <div className="flex items-center justify-center gap-3">
          <Button
            size="lg"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          >
            ← Previous
          </Button>
          <span className="font-mono text-sm text-ink-muted tabular-nums">
            Slide {index + 1} / {slides.length}
          </span>
          <Button
            variant="primary"
            size="lg"
            disabled={index >= slides.length - 1}
            onClick={() => setIndex((i) => Math.min(i + 1, slides.length - 1))}
          >
            Next →
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-ink-muted">
          Use the arrow keys, or Esc to close.
        </p>
      </div>
    </div>
  );
}
