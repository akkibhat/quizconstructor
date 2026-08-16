"use client";

import { useState } from "react";

import { RoundPreviewModal } from "@/components/rounds/RoundPreviewModal";
import { AppShell, BackLink } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldStyles, Label } from "@/components/ui/Field";
import { ParsedListField } from "@/components/ui/ParsedListField";
import { cn } from "@/lib/cn";
import { updateRound } from "@/lib/rounds";
import type { Round } from "@/lib/types/round";

export function ListRoundEditor({ quizId, round }: { quizId: string; round: Round }) {
  const [previewing, setPreviewing] = useState(false);

  return (
    <AppShell>
      <BackLink href={`/admin/quizzes/${quizId}`}>Back to quiz</BackLink>

      <div className="mb-2 flex items-center justify-between gap-3">
        <Badge tone="mint">The Gauntlet</Badge>
        <Button size="sm" onClick={() => setPreviewing(true)}>
          Preview
        </Button>
      </div>
      <input
        defaultValue={round.title}
        onBlur={(event) => updateRound(quizId, round.id, { title: event.target.value })}
        className={cn(fieldStyles, "font-display mb-3 text-2xl font-semibold")}
      />
      <p className="mb-8 text-sm text-ink-muted">
        One shared prompt, scored on how many answers a team gets right in a row before their
        first miss - enter that count as the raw score on the Scoring page, same as any other
        round.
      </p>

      <div className="mb-6 space-y-1.5">
        <Label htmlFor="listPrompt">Prompt (shown to the room)</Label>
        <textarea
          id="listPrompt"
          defaultValue={round.listPrompt ?? ""}
          placeholder="e.g. Name any 10 of the top 25 busiest airports in the world"
          onBlur={(event) => updateRound(quizId, round.id, { listPrompt: event.target.value })}
          className={fieldStyles}
          rows={2}
        />
      </div>

      <ParsedListField
        id="listAnswerReference"
        label="Reference list"
        unitLabel="answer"
        unitClassName="text-mint"
        defaultValue={round.listAnswerReference}
        placeholder="Paste in the full valid-answer list, one per line - your own cheat sheet while marking, also shown to the room as the reveal afterwards. Numbering or bullets are fine, they'll be stripped automatically."
        rows={16}
        onSave={(parsed) => updateRound(quizId, round.id, { listAnswerReference: parsed })}
      />

      {previewing && (
        <RoundPreviewModal round={round} questions={[]} onClose={() => setPreviewing(false)} />
      )}
    </AppShell>
  );
}
