"use client";

import Link from "next/link";

function Spinner() {
  return (
    <svg
      className="h-7 w-7 animate-spin text-neutral-600"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

type Variant = "screen" | "panel";

/**
 * Shared "still loading" state for every route gated by a quiz's 4-letter
 * code (Display, Leaderboard, Control, Scoring, Team Setup) - previously
 * each route had its own bare, unstyled "Loading…" text.
 *
 * `variant="screen"` is for the two code-only routes that render
 * full-bleed on their own dark background and get seen by the whole room
 * (Display, Leaderboard) - larger and centered with no card chrome, since
 * it's already the entire screen. `variant="panel"` (the default) fits
 * inside the normal host-facing page layout (Control, Scoring, Team
 * Setup).
 */
export function CodeGateLoading({ variant = "panel" }: { variant?: Variant }) {
  const isScreen = variant === "screen";
  return (
    <div
      className={
        isScreen
          ? "flex flex-col items-center gap-4 text-neutral-500"
          : "mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center text-neutral-500"
      }
    >
      <Spinner />
      <p className={isScreen ? "text-2xl" : "text-sm"}>Loading…</p>
    </div>
  );
}

/**
 * Generic "the thing you asked for isn't there" panel - used directly by
 * the admin routes (where the URL carries a Firestore document ID rather
 * than a quiz code) and reused by CodeNotFound below. Always links back
 * to the dashboard, since anyone who lands here is a signed-in host who
 * can navigate away.
 */
export function NotFoundPanel({
  title,
  message,
}: {
  title: string;
  message: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-lg font-semibold text-neutral-200">{title}</p>
      <p className="mt-2 text-sm text-neutral-500">{message}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}

/**
 * Shown when the 4-letter code in the URL doesn't match any quiz -
 * mistyped, or the quiz was archived. The "screen" variant is a bare
 * centered card with no dashboard link, since it's what the projector
 * shows to a whole room that can't navigate anywhere.
 */
export function CodeNotFound({ code, variant = "panel" }: { code: string; variant?: Variant }) {
  const detail = (
    <>
      No quiz is using the code <span className="font-mono text-neutral-300">{code}</span>.
    </>
  );

  if (variant === "screen") {
    return (
      <div className="max-w-md rounded-lg border border-neutral-800 bg-neutral-900/60 px-10 py-8 text-center">
        <p className="text-3xl font-semibold text-neutral-200">Quiz not found</p>
        <p className="mt-3 text-lg text-neutral-500">{detail}</p>
      </div>
    );
  }

  return <NotFoundPanel title="Quiz not found" message={detail} />;
}
