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
 * A UX guard, not security - it only avoids flashing an admin page at
 * someone about to be bounced. The real enforcement is in the Firestore
 * and Storage rules, which every read and write goes through regardless
 * of which route rendered the button.
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
