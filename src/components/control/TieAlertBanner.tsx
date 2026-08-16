"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { fieldStyles } from "@/components/ui/Field";
import { startTiebreak } from "@/lib/liveState";
import type { TieGroup } from "@/lib/tieDetection";
import type { TiebreakMode } from "@/lib/types/liveState";
import type { TiebreakQuestion } from "@/lib/types/tiebreakQuestion";

export function TieAlertBanner({
  quizId,
  hostUid,
  tieGroups,
  tiebreakQuestions,
}: {
  quizId: string;
  hostUid: string;
  tieGroups: TieGroup[];
  tiebreakQuestions: TiebreakQuestion[] | undefined;
}) {
  const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [mode, setMode] = useState<TiebreakMode>("app-computes");

  if (tieGroups.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-2">
      {tieGroups.map((group, index) => (
        <div
          key={index}
          className="rounded-panel border border-danger/50 bg-danger/10 p-4 text-sm"
        >
          <p className="text-ink">
            <span className="font-display font-semibold tracking-wide text-danger uppercase">
              Tie for {group.position === "top" ? "1st/2nd/3rd" : "2nd-to-last"}
            </span>
            <br />
            {group.teams.map((team) => team.name).join(", ")} — all {group.score} pts
          </p>
          {resolvingIndex === index ? (
            <div className="mt-3 space-y-3">
              <select
                value={selectedQuestionId}
                onChange={(event) => setSelectedQuestionId(event.target.value)}
                className={fieldStyles}
              >
                <option value="">Pick a tiebreak question…</option>
                {tiebreakQuestions?.map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.question}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-4 text-ink-soft">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    checked={mode === "app-computes"}
                    onChange={() => setMode("app-computes")}
                    className="accent-flame"
                  />
                  App computes winner
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    checked={mode === "manual"}
                    onChange={() => setMode("manual")}
                    className="accent-flame"
                  />
                  I&apos;ll judge manually
                </label>
              </div>
              <Button
                variant="primary"
                disabled={!selectedQuestionId}
                onClick={() => {
                  const question = tiebreakQuestions?.find((q) => q.id === selectedQuestionId);
                  if (!question) return;
                  startTiebreak(
                    quizId,
                    hostUid,
                    question.question,
                    question.answer,
                    group.position,
                    group.teams.map((team) => team.teamId),
                    mode,
                    // Recorded from the outset so that if this question
                    // fails to separate anyone, the decider that follows
                    // can't pick the same one again.
                    {
                      attempt: 1,
                      pendingOrder: null,
                      pendingDeadHeats: [],
                      usedQuestionIds: [question.id],
                    }
                  );
                  setResolvingIndex(null);
                  setSelectedQuestionId("");
                }}
              >
                Start Tiebreak
              </Button>
            </div>
          ) : (
            <Button variant="danger" size="sm" className="mt-3" onClick={() => setResolvingIndex(index)}>
              Resolve Tie
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
