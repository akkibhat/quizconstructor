"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Wordmark } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/Button";
import { fieldStyles, Label } from "@/components/ui/Field";
import { ScreenFrame } from "@/components/ui/ScreenFrame";
import { auth } from "@/lib/firebase/client";

// The only account this app ever expects is the single host account,
// created once directly in the Firebase Console. There's no signup form
// here on purpose - see the plan doc for why.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch {
      setError("Couldn't sign in - check the email and password and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-backdrop px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Wordmark className="text-lg" />
          <p className="mt-2 text-sm text-ink-muted">Sign in to build and run your quizzes.</p>
        </div>

        <ScreenFrame as="form" onSubmit={handleSubmit} className="space-y-4 p-8">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldStyles}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldStyles}
            />
          </div>

          {error && (
            <p className="rounded-chip border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </ScreenFrame>
      </div>
    </div>
  );
}
