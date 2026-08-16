"use client";

import { cn } from "@/lib/cn";

/**
 * A pill that's either picked or not - choosing a round to score, a team
 * to mark, a double-points pick. Selection fills it with the accent
 * colour rather than just outlining it, so which one is active reads at a
 * glance across a list.
 */
export function ChipToggle({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-chip border px-3 py-2 text-sm transition-colors",
        selected
          ? "border-flame bg-flame font-semibold text-on-flame"
          : "border-edge-strong text-ink-muted hover:border-flame/60 hover:text-ink-soft",
        className
      )}
    >
      {children}
    </button>
  );
}
