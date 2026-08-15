"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, BackLink, PageHeader } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/Button";
import { fieldStyles, Label } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/hooks/useAuth";
import { createQuiz } from "@/lib/quizzes";

/** A checkbox that turns a whole labelled row into the click target. */
function ToggleRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-flame"
      />
      {children}
    </label>
  );
}

function NewQuizForm() {
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [numRounds, setNumRounds] = useState(8);
  const [longGameEnabled, setLongGameEnabled] = useState(false);
  const [longGameMaxPoints, setLongGameMaxPoints] = useState(10);
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
        longGameMaxPoints,
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
    <AppShell>
      <BackLink href="/">Back to dashboard</BackLink>
      <PageHeader eyebrow="Set up" title="New quiz" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Panel className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <input
              id="title"
              required
              placeholder="e.g. Thursday Night Quiz"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={fieldStyles}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={cn(fieldStyles, "[color-scheme:dark]")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="numRounds">Number of rounds</Label>
            <input
              id="numRounds"
              type="number"
              min={1}
              max={30}
              required
              value={numRounds}
              onChange={(event) => setNumRounds(Number(event.target.value))}
              className={cn(fieldStyles, "w-32 tabular-nums")}
            />
            <p className="text-xs text-ink-muted">
              Scaffolds this many rounds to start - you can add, remove, or reorder them
              afterwards.
            </p>
          </div>
        </Panel>

        <Panel className="space-y-4">
          <ToggleRow checked={longGameEnabled} onChange={setLongGameEnabled}>
            Enable <span className="font-semibold text-gold">The Long Game</span>
          </ToggleRow>

          {longGameEnabled && (
            <div className="space-y-1.5 border-l-2 border-gold/40 pl-4">
              <Label htmlFor="longGameMaxPoints">Points for a round 1 correct guess</Label>
              <input
                id="longGameMaxPoints"
                type="number"
                min={1}
                required
                value={longGameMaxPoints}
                onChange={(event) => setLongGameMaxPoints(Number(event.target.value))}
                className={cn(fieldStyles, "w-32 tabular-nums")}
              />
              <p className="text-xs text-ink-muted">
                Decreases each round, always landing on exactly 1 point by the last round -
                typically set to match how many questions are in a round.
              </p>
            </div>
          )}
        </Panel>

        <Panel className="space-y-4">
          <ToggleRow checked={doublePointsEnabled} onChange={setDoublePointsEnabled}>
            Enable double-points rounds
          </ToggleRow>

          {doublePointsEnabled && (
            <div className="space-y-1.5 border-l-2 border-flame/40 pl-4">
              <Label htmlFor="doublePicks">Double-point round picks per team</Label>
              <input
                id="doublePicks"
                type="number"
                min={1}
                max={numRounds}
                required
                value={doublePointsPicksPerTeam}
                onChange={(event) => setDoublePointsPicksPerTeam(Number(event.target.value))}
                className={cn(fieldStyles, "w-32 tabular-nums")}
              />
            </div>
          )}
        </Panel>

        {error && (
          <p className="rounded-chip border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create Quiz"}
        </Button>
      </form>
    </AppShell>
  );
}

export default function NewQuizPage() {
  return (
    <RequireAuth>
      <NewQuizForm />
    </RequireAuth>
  );
}
