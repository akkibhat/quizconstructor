"use client";

import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * The wordmark. Set in the display face, split so "QUIZ" carries the
 * accent and "CONSTRUCTOR" recedes - reads as one word at a glance but
 * gives the brand a bit of shape.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-base font-semibold tracking-[0.14em] uppercase",
        className
      )}
    >
      <span className="text-flame">Quiz</span>
      <span className="text-ink">Constructor</span>
    </span>
  );
}

/**
 * The frame every host-facing page sits in: a slim sticky bar with the
 * wordmark on the left and page-specific actions on the right, over a
 * centred content column.
 *
 * Deliberately not used on Display or the standalone Leaderboard -
 * those are projected to a room and should be nothing but content.
 */
export function AppShell({
  children,
  actions,
  width = "narrow",
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  width?: "narrow" | "wide";
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-edge bg-backdrop/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Wordmark />
          </Link>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 py-8",
          width === "narrow" ? "max-w-3xl" : "max-w-5xl"
        )}
      >
        {children}
      </main>
    </div>
  );
}

/**
 * The title block at the top of a page's content: an optional small
 * label above, the page title in the display face, and room for a quiz
 * code or actions on the right.
 */
export function PageHeader({
  title,
  eyebrow,
  meta,
  actions,
  description,
}: {
  title: string;
  eyebrow?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-flame uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {meta}
          {actions}
        </div>
      </div>
      {description && <p className="mt-3 text-sm text-ink-muted">{description}</p>}
    </div>
  );
}

/** The quiz's 4-letter code, styled consistently wherever it appears. */
export function QuizCode({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-chip border border-edge-strong px-2 py-1 font-mono text-sm tracking-[0.14em] text-ink-soft",
        className
      )}
    >
      {code}
    </span>
  );
}

/** A back link, styled the same on every page that has one. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
    >
      <span aria-hidden="true">←</span> {children}
    </Link>
  );
}

/** Section heading used within a page, below the PageHeader. */
export function SectionHeading({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="font-display text-lg font-semibold tracking-wide text-ink">{children}</h2>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
