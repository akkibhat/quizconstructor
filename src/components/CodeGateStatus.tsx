"use client";

import Link from "next/link";

import { buttonStyles } from "@/components/ui/Button";

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3.5A4.5 4.5 0 007.5 12H4z"
      />
    </svg>
  );
}

type Variant = "screen" | "panel";

/**
 * Shared "still loading" state for every route gated by a quiz's
 * 4-letter code (Display, Leaderboard, Control, Scoring, Team Setup).
 *
 * `variant="screen"` is for the two code-only routes projected to a
 * whole room (Display, Leaderboard) - larger, centred, no chrome, since
 * it already is the entire screen. `variant="panel"` (the default) sits
 * inside the normal host-facing page layout.
 */
export function CodeGateLoading({ variant = "panel" }: { variant?: Variant }) {
  const isScreen = variant === "screen";
  return (
    <div
      className={
        isScreen
          ? "flex flex-col items-center gap-5 text-ink-muted"
          : "mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center text-ink-muted"
      }
    >
      <Spinner className={isScreen ? "h-10 w-10 animate-spin text-flame" : "h-6 w-6 animate-spin text-flame"} />
      <p className={isScreen ? "font-display text-2xl tracking-[0.2em] uppercase" : "text-sm"}>
        Loading…
      </p>
    </div>
  );
}

/**
 * Generic "the thing you asked for isn't there" panel - used directly
 * by the admin routes (where the URL carries a Firestore document ID
 * rather than a quiz code) and reused by CodeNotFound below. Always
 * links back to the dashboard, since anyone who lands here is a
 * signed-in host who can navigate away.
 */
export function NotFoundPanel({ title, message }: { title: string; message: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-display text-2xl font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-muted">{message}</p>
      <Link href="/" className={buttonStyles("secondary", "md", "mt-6")}>
        ← Back to dashboard
      </Link>
    </div>
  );
}

/**
 * Shown when the 4-letter code in the URL doesn't match any quiz -
 * mistyped, or the quiz was archived. The "screen" variant is a bare
 * centred card with no dashboard link, since it's what the projector
 * shows to a whole room that can't navigate anywhere.
 */
export function CodeNotFound({ code, variant = "panel" }: { code: string; variant?: Variant }) {
  const detail = (
    <>
      No quiz is using the code <span className="font-mono text-ink">{code}</span>.
    </>
  );

  if (variant === "screen") {
    return (
      <div className="max-w-lg text-center">
        <p className="font-display text-5xl font-bold tracking-wide text-ink uppercase">
          Quiz not found
        </p>
        <p className="mt-4 text-xl text-ink-muted">{detail}</p>
      </div>
    );
  }

  return <NotFoundPanel title="Quiz not found" message={detail} />;
}
