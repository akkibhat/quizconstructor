"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/hooks/useAuth";
import { createQuiz } from "@/lib/quizzes";

function NewQuizForm() {
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [numRounds, setNumRounds] = useState(8);
  const [longGameEnabled, setLongGameEnabled] = useState(false);
  const [doublePointsEnabled, setDoublePointsEnabled] = useState(false);
  const [doublePointsPicksPerTeam, setDoublePointsPicksPerTeam] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const { quizId } = await createQuiz({
        title,
        date: new Date(date),
        numRounds,
        longGameEnabled,
        doublePointsEnabled,
        // If double points is off, this value is irrelevant - the team
        // model treats it as "pick zero rounds" regardless.
        doublePointsPicksPerTeam,
        hostUid: user.uid,
      });
      router.push(`/admin/quizzes/${quizId}`);
    } catch (submitError) {
      // Logged so the actual Firestore/rules error is visible in devtools -
      // the on-page message stays generic since most causes aren't
      // actionable by whoever's looking at the form.
      console.error("Failed to create quiz:", submitError);
      setError("Couldn't create the quiz - please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-100">New Quiz</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label htmlFor="title" className="text-sm text-neutral-400">
            Title
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="date" className="text-sm text-neutral-400">
            Date
          </label>
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="numRounds" className="text-sm text-neutral-400">
            Number of rounds
          </label>
          <input
            id="numRounds"
            type="number"
            min={1}
            max={30}
            required
            value={numRounds}
            onChange={(event) => setNumRounds(Number(event.target.value))}
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
          />
          <p className="text-xs text-neutral-500">
            Scaffolds this many rounds to start - you can add, remove, or reorder them
            afterwards.
          </p>
        </div>

        <label className="flex items-center gap-2 text-neutral-100">
          <input
            type="checkbox"
            checked={longGameEnabled}
            onChange={(event) => setLongGameEnabled(event.target.checked)}
          />
          Enable The Long Game
        </label>

        <label className="flex items-center gap-2 text-neutral-100">
          <input
            type="checkbox"
            checked={doublePointsEnabled}
            onChange={(event) => setDoublePointsEnabled(event.target.checked)}
          />
          Enable double-points rounds
        </label>

        {doublePointsEnabled && (
          <div className="space-y-1 pl-6">
            <label htmlFor="doublePicks" className="text-sm text-neutral-400">
              Double-point round picks per team
            </label>
            <input
              id="doublePicks"
              type="number"
              min={1}
              max={numRounds}
              required
              value={doublePointsPicksPerTeam}
              onChange={(event) => setDoublePointsPicksPerTeam(Number(event.target.value))}
              className="w-32 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-neutral-100 px-4 py-2 font-medium text-neutral-900 disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : "Create Quiz"}
        </button>
      </form>
    </div>
  );
}

export default function NewQuizPage() {
  return (
    <RequireAuth>
      <NewQuizForm />
    </RequireAuth>
  );
}
