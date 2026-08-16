"use client";

import { AppShell, BackLink } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/Badge";
import { fieldStyles, Label } from "@/components/ui/Field";
import { ParsedListField } from "@/components/ui/ParsedListField";
import { cn } from "@/lib/cn";
import { updateRound } from "@/lib/rounds";

export function ListRoundEditor({
  quizId,
  roundId,
  title,
  listPrompt,
  listAnswerReference,
}: {
  quizId: string;
  roundId: string;
  title: string;
  listPrompt: string | null;
  listAnswerReference: string[] | null;
}) {
  return (
    <AppShell>
      <BackLink href={`/admin/quizzes/${quizId}`}>Back to quiz</BackLink>

      <div className="mb-2 flex items-center gap-3">
        <Badge tone="mint">The Gauntlet</Badge>
      </div>
      <input
        defaultValue={title}
        onBlur={(event) => updateRound(quizId, roundId, { title: event.target.value })}
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
          defaultValue={listPrompt ?? ""}
          placeholder="e.g. Name any 10 of the top 25 busiest airports in the world"
          onBlur={(event) => updateRound(quizId, roundId, { listPrompt: event.target.value })}
          className={fieldStyles}
          rows={2}
        />
      </div>

      <ParsedListField
        id="listAnswerReference"
        label="Reference list"
        unitLabel="answer"
        unitClassName="text-mint"
        defaultValue={listAnswerReference}
        placeholder="Paste in the full valid-answer list, one per line - your own cheat sheet while marking, also shown to the room as the reveal afterwards. Numbering or bullets are fine, they'll be stripped automatically."
        rows={16}
        onSave={(parsed) => updateRound(quizId, roundId, { listAnswerReference: parsed })}
      />
    </AppShell>
  );
}
