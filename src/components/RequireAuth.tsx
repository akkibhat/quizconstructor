"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CodeGateLoading } from "@/components/CodeGateStatus";
import { useAuth } from "@/lib/hooks/useAuth";

/**
 * Wraps any page that should only be usable while signed in (the admin
 * Content Builder, Team Setup, Controller, Scoring). Redirects to /login
 * if nobody's signed in.
 *
 * This is a UX guard only, not real security - it just avoids flashing an
 * admin page at someone who isn't signed in before they get bounced. The
 * actual enforcement happens in Firestore/Storage security rules, since
 * every read/write goes through those regardless of which route rendered
 * the button that triggered it.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.replace("/login");
    }
  }, [user, router]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CodeGateLoading variant="screen" />
      </div>
    );
  }

  if (user === null) {
    // About to redirect via the effect above - render nothing in the
    // meantime rather than flashing the protected content.
    return null;
  }

  return <>{children}</>;
}
