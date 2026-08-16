"use client";

import { useState } from "react";

import { AppShell, BackLink } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/Badge";
import { fieldStyles, Label } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { parseAnswerList } from "@/lib/questionsImportExport";
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
  // Tracks the parsed count live as the host types/pastes, so they can
  // eyeball "did that paste actually give me 25 answers" before saving -
  // the textarea itself still holds raw text; parseAnswerList only runs
  // for real (and gets saved) on blur.
  const [answerCount, setAnswerCount] = useState(listAnswerReference?.length ?? 0);

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

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="listAnswerReference">Reference list</Label>
          <span className="font-mono text-xs text-mint tabular-nums">
            {answerCount} answer{answerCount === 1 ? "" : "s"}
          </span>
        </div>
        <textarea
          id="listAnswerReference"
          defaultValue={listAnswerReference?.join("\n") ?? ""}
          placeholder="Paste in the full valid-answer list, one per line - your own cheat sheet while marking, also shown to the room as the reveal afterwards. Numbering or bullets are fine, they'll be stripped automatically."
          onChange={(event) => setAnswerCount(parseAnswerList(event.target.value).length)}
          onBlur={(event) => {
            const parsed = parseAnswerList(event.target.value);
            event.target.value = parsed.join("\n");
            setAnswerCount(parsed.length);
            updateRound(quizId, roundId, { listAnswerReference: parsed });
          }}
          className={cn(fieldStyles, "font-mono text-sm")}
          rows={16}
        />
      </div>
    </AppShell>
  );
}
