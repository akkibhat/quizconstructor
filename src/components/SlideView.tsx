"use client";

import { useMediaUrl } from "@/lib/hooks/useMediaUrl";
import type { Slide } from "@/lib/types/slide";

/**
 * Small uppercase label shown above a slide's main content - identifies
 * what's on screen at a glance (a special round type, or just a plain
 * Question/Answer). Same size/tracking everywhere; only the color
 * changes, reserved for the two special round types (amber = The Long
 * Game, sky = The Gauntlet) so a plain question/answer slide still gets a
 * label instead of looking flatter than the special ones next to it.
 */
function Eyebrow({
  text,
  colorClassName = "text-neutral-500",
}: {
  text: string;
  colorClassName?: string;
}) {
  return <h2 className={`text-xl tracking-widest uppercase ${colorClassName}`}>{text}</h2>;
}

/**
 * Picks a column count and font size for the Gauntlet's reveal list from
 * how many answers there are. A projector audience has no way to scroll
 * the screen, so unlike a normal web page, a long list can't just scroll
 * past the fold - it has to shrink and spread into more columns to
 * actually stay visible instead.
 */
function listAnswerLayout(count: number): { columns: string; text: string } {
  if (count <= 8) return { columns: "grid-cols-1", text: "text-3xl" };
  if (count <= 16) return { columns: "grid-cols-2", text: "text-2xl" };
  return { columns: "grid-cols-3", text: "text-xl" };
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
    return <p className="text-4xl text-neutral-500">Waiting…</p>;
  }

  switch (slide.type) {
    case "round-title":
    case "answers-divider":
      return <h1 className="text-center text-6xl font-bold text-neutral-100">{slide.title}</h1>;

    case "question":
      return (
        <div className="flex flex-col items-center gap-8">
          <Eyebrow text="Question" />
          <p className="max-w-4xl text-center text-4xl text-neutral-100">{slide.text}</p>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- see file-level comment
            <img src={imageUrl} alt="" className="max-h-[60vh] max-w-[80vw] rounded" />
          )}
        </div>
      );

    case "long-game-clue":
      return (
        <div className="flex flex-col items-center gap-8">
          <Eyebrow text="The Long Game" colorClassName="text-amber-400" />
          <p className="max-w-4xl text-center text-4xl text-neutral-100">{slide.clueText}</p>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- see file-level comment
            <img src={imageUrl} alt="" className="max-h-[60vh] max-w-[80vw] rounded" />
          )}
        </div>
      );

    case "answer":
      return (
        <div className="flex flex-col items-center gap-6">
          <Eyebrow text="Answer" />
          <p className="max-w-4xl text-center text-5xl text-neutral-100">{slide.answerText}</p>
        </div>
      );

    case "long-game-answer":
      return (
        <div className="flex flex-col items-center gap-6">
          <Eyebrow text="The Long Game — Answer" colorClassName="text-amber-400" />
          <p className="max-w-4xl text-center text-5xl text-neutral-100">{slide.answerText}</p>
        </div>
      );

    case "list-prompt":
      return (
        <div className="flex flex-col items-center gap-6">
          <Eyebrow text="The Gauntlet" colorClassName="text-sky-400" />
          <p className="max-w-4xl text-center text-4xl text-neutral-100">{slide.prompt}</p>
        </div>
      );

    case "list-answer": {
      const layout = listAnswerLayout(slide.answerReference.length);
      return (
        <div className="flex flex-col items-center gap-6">
          <Eyebrow text="The Gauntlet — Answers" colorClassName="text-sky-400" />
          <ol
            className={`grid ${layout.columns} max-w-6xl gap-x-10 gap-y-2 ${layout.text} text-neutral-100`}
          >
            {slide.answerReference.map((answer, index) => (
              <li key={index} className="text-left">
                <span className="text-sky-400">{index + 1}.</span> {answer}
              </li>
            ))}
          </ol>
        </div>
      );
    }
  }
}
