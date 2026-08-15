"use client";

import { useMediaUrl } from "@/lib/hooks/useMediaUrl";
import type { Slide } from "@/lib/types/slide";

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
          <h2 className="text-2xl tracking-widest text-amber-400 uppercase">The Long Game</h2>
          <p className="max-w-4xl text-center text-4xl text-neutral-100">{slide.clueText}</p>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- see file-level comment
            <img src={imageUrl} alt="" className="max-h-[60vh] max-w-[80vw] rounded" />
          )}
        </div>
      );

    case "answer":
      return <p className="max-w-4xl text-center text-5xl text-neutral-100">{slide.answerText}</p>;

    case "long-game-answer":
      return (
        <div className="flex flex-col items-center gap-8">
          <h2 className="text-2xl tracking-widest text-amber-400 uppercase">
            The Long Game — Answer
          </h2>
          <p className="max-w-4xl text-center text-5xl text-neutral-100">{slide.answerText}</p>
        </div>
      );
  }
}
