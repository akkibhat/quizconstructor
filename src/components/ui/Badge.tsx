import { cn } from "@/lib/cn";

export type BadgeTone = "gold" | "mint" | "flame" | "neutral";

// Each special round type keeps a fixed colour across every surface it
// appears on - gold is always The Long Game, mint is always The
// Gauntlet - so they're recognisable at a glance whether you're looking
// at the projector, the round list or the scoring page.
const TONES: Record<BadgeTone, string> = {
  gold: "border-gold/45 text-gold",
  mint: "border-mint/45 text-mint",
  flame: "border-flame/50 text-flame",
  neutral: "border-edge-strong text-ink-muted",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-chip border px-1.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
