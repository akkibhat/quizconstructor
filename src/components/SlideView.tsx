"use client";

import { cn } from "@/lib/cn";
import { useMediaUrl } from "@/lib/hooks/useMediaUrl";
import type { Slide } from "@/lib/types/slide";

/**
 * Small uppercase label above a slide's content - identifies what's on
 * screen at a glance (a special round type, or just Question/Answer).
 * Same size and tracking everywhere; only the colour changes, so a
 * plain question never looks flatter than a Long Game clue sitting next
 * to it in the running order.
 */
function Eyebrow({ text, tone = "flame" }: { text: string; tone?: "flame" | "gold" | "mint" }) {
  const color = { flame: "text-flame", gold: "text-gold", mint: "text-mint" }[tone];
  return (
    <p className={cn("font-display text-xl font-semibold tracking-[0.3em] uppercase", color)}>
      {text}
    </p>
  );
}

/**
 * Picks a column count and font size for The Gauntlet's reveal from how
 * many answers there are. A room can't scroll the projector, so unlike
 * a web page a long list has to shrink and spread into more columns to
 * stay visible rather than running off the bottom.
 */
function listAnswerLayout(count: number): { columns: string; text: string } {
  if (count <= 8) return { columns: "grid-cols-1", text: "text-3xl" };
  if (count <= 16) return { columns: "grid-cols-2", text: "text-2xl" };
  return { columns: "grid-cols-3", text: "text-xl" };
}

/** Shared frame for every slide - centres content and sets the rhythm. */
function SlideFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-8 text-center">{children}</div>;
}

/** The main body text of a slide, at the two sizes slides actually use. */
function SlideText({ children, size = "md" }: { children: React.ReactNode; size?: "md" | "lg" }) {
  return (
    <p
      className={cn(
        "font-display max-w-4xl leading-tight font-semibold text-balance text-ink",
        size === "lg" ? "text-6xl" : "text-5xl"
      )}
      style={{ textShadow: "0 2px 0 rgba(0,0,0,0.28)" }}
    >
      {children}
    </p>
  );
}

/**
 * Renders a single presenter slide. Shared by the Display route (full
 * screen, this is the whole page) and the Controller route (current +
 * next slide preview), so the two always render slides identically.
 *
 * Uses a plain <img>, not next/image - the source is a Firebase Storage
 * URL resolved at runtime, not something known at build time, so
 * next/image's remote-domain allowlisting would add friction for no real
 * benefit in a personal tool like this.
 */
export function SlideView({ slide }: { slide: Slide | undefined }) {
  const imagePath =
    slide?.type === "question" || slide?.type === "long-game-clue" ? slide.imagePath : null;
  const imageUrl = useMediaUrl(imagePath);

  if (!slide) {
    return <p className="font-display text-4xl text-ink-muted">Waiting…</p>;
  }

  switch (slide.type) {
    case "round-title":
    case "answers-divider":
      return (
        <h1 className="font-display max-w-5xl text-center text-7xl font-bold text-balance text-ink">
          {slide.title}
        </h1>
      );

    case "question":
      return (
        <SlideFrame>
          <Eyebrow text="Question" />
          <SlideText>{slide.text}</SlideText>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- see file-level comment
            <img
              src={imageUrl}
              alt=""
              className="max-h-[55vh] max-w-[80vw] rounded-panel border-2 border-edge-strong"
            />
          )}
        </SlideFrame>
      );

    case "long-game-clue":
      return (
        <SlideFrame>
          <Eyebrow text="The Long Game" tone="gold" />
          <SlideText>{slide.clueText}</SlideText>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- see file-level comment
            <img
              src={imageUrl}
              alt=""
              className="max-h-[55vh] max-w-[80vw] rounded-panel border-2 border-gold/40"
            />
          )}
        </SlideFrame>
      );

    case "answer":
      return (
        <SlideFrame>
          <Eyebrow text="Answer" />
          <SlideText size="lg">{slide.answerText}</SlideText>
        </SlideFrame>
      );

    case "long-game-answer":
      return (
        <SlideFrame>
          <Eyebrow text="The Long Game — Answer" tone="gold" />
          <SlideText size="lg">{slide.answerText}</SlideText>
        </SlideFrame>
      );

    case "list-prompt":
      return (
        <SlideFrame>
          <Eyebrow text="The Gauntlet" tone="mint" />
          <SlideText>{slide.prompt}</SlideText>
        </SlideFrame>
      );

    case "list-answer": {
      const layout = listAnswerLayout(slide.answerReference.length);
      return (
        <SlideFrame>
          <Eyebrow text="The Gauntlet — Answers" tone="mint" />
          <ol
            className={cn(
              "grid max-w-6xl gap-x-12 gap-y-2.5 text-ink",
              layout.columns,
              layout.text
            )}
          >
            {slide.answerReference.map((answer, index) => (
              <li key={index} className="flex gap-2.5 text-left">
                <span className="font-mono text-mint tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{answer}</span>
              </li>
            ))}
          </ol>
        </SlideFrame>
      );
    }
  }
}
