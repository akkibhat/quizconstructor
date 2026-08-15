"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// The "My Quizzes" list moved to the dashboard at "/" - this route is
// kept as a redirect so any old bookmarks/links to it still land
// somewhere useful, rather than 404ing.
export default function QuizzesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return <p className="p-10 text-neutral-400">Redirecting…</p>;
}
