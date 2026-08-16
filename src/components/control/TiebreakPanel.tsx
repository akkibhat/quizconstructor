"use client";

import { useEffect, useRef, useState } from "react";

import { TiebreakGuessList } from "@/components/control/TiebreakGuessList";
import { TiebreakWinnerPicker } from "@/components/control/TiebreakWinnerPicker";
import { AppShell, PageHeader } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/Button";
import { ScreenFrame } from "@/components/ui/ScreenFrame";
import { endTiebreak, revealTiebreak, setTiebreakGuesses, startTiebreak } from "@/lib/liveState";
import { computeTiebreakWinner } from "@/lib/tieDetection";
import { applyTiebreakResult, detectDeadHeats, rankTeamsByGuess, spliceResolvedOrder } from "@/lib/tiebreakResults";
import type { TiebreakState } from "@/lib/types/liveState";
import type { TiebreakQuestion } from "@/lib/types/tiebreakQuestion";
import type { Team } from "@/lib/types/team";

export function TiebreakPanel({
  quizId,
  hostUid,
  tiebreak,
  teams,
  tiebreakQuestions,
}: {
  quizId: string;
  hostUid: string;
  tiebreak: TiebreakState;
  teams: Team[];
  tiebreakQuestions: TiebreakQuestion[] | undefined;
}) {
  const contestedTeams = tiebreak.contestedTeamIds
    .map((teamId) => teams.find((team) => team.id === teamId))
    .filter((team): team is Team => Boolean(team));
  // In manual mode the host judges from paper, so the app has no way to
  // work out who won - they tell it by clicking the winning team here.
  const [manualWinnerId, setManualWinnerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /*
   * The guesses as typed, which everything below is computed from.
   *
   * These deliberately aren't read back out of Firestore. Saving on blur
   * alone meant a number still sitting in a focused input hadn't been
   * written yet, so the distances, the LEVEL badges, the dead-heat
   * verdict and the final ranking were all working from the *previous*
   * value until the host happened to click away. Clicking a button
   * doesn't rescue it either - the blur does fire first, but its write
   * and the snapshot coming back don't land before the click handler
   * reads the guesses, so it would still rank on stale numbers.
   *
   * Firestore is written behind this state rather than being the source
   * for it, debounced so the projector isn't updated on every keystroke.
   */
  const [draftGuesses, setDraftGuesses] = useState<Record<string, number>>(tiebreak.guesses);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function updateGuess(teamId: string, raw: string) {
    const next = { ...draftGuesses };
    const value = Number(raw);
    if (raw.trim() === "" || Number.isNaN(value)) {
      // Cleared, so the team counts as not having answered again -
      // otherwise a half-deleted number would still look like a guess.
      delete next[teamId];
    } else {
      next[teamId] = value;
    }
    setDraftGuesses(next);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setTiebreakGuesses(quizId, hostUid, tiebreak, next);
    }, 400);
  }

  /** Pushes anything still waiting on the debounce before acting on it. */
  async function flushGuesses() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    await setTiebreakGuesses(quizId, hostUid, tiebreak, draftGuesses);
  }

  const computedWinnerId =
    tiebreak.mode === "app-computes" && tiebreak.revealed
      ? computeTiebreakWinner(tiebreak.correctAnswer, draftGuesses)
      : null;

  // Ranking - and spotting teams it failed to separate - only means
  // anything once every contested team has a guess recorded.
  const allGuessesIn = tiebreak.contestedTeamIds.every(
    (teamId) => draftGuesses[teamId] !== undefined
  );
  const spentQuestionIds = tiebreak.usedQuestionIds ?? [];
  const followUpsAvailable = (tiebreakQuestions ?? []).filter(
    (question) => !spentQuestionIds.includes(question.id)
  ).length;

  const deadHeats =
    tiebreak.mode === "app-computes" && tiebreak.revealed && allGuessesIn
      ? detectDeadHeats(
          tiebreak.correctAnswer,
          draftGuesses,
          rankTeamsByGuess(tiebreak.correctAnswer, draftGuesses, tiebreak.contestedTeamIds)
        )
      : [];
  // Nobody in a dead heat has won anything yet, so none of them get the
  // winner treatment - that's the whole point of catching it.
  const levelTeamIds = new Set(deadHeats.flat());

  const winnerId = tiebreak.mode === "app-computes" ? computedWinnerId : manualWinnerId;
  const canProceed =
    tiebreak.revealed &&
    (tiebreak.mode === "app-computes"
      ? allGuessesIn && (deadHeats.length === 0 || followUpsAvailable > 0)
      : Boolean(manualWinnerId));

  /**
   * Records the placing and returns to the leaderboard - unless the
   * guesses left someone level, in which case it runs another decider
   * between just those teams.
   *
   * Nothing is recorded until this runs, so abandoning via "Back to
   * Leaderboard" can't quietly award a prize.
   *
   * Everyone is ranked, not just the winner: 2nd and 3rd are real
   * placings in a podium tie, and ranking the rest is what marks the
   * group settled so the "Tiebreak pending" badges clear.
   */
  async function confirmResult() {
    if (!canProceed) return;
    setIsSaving(true);
    try {
      // Push anything still waiting on the debounce, so the recorded
      // tiebreak matches what was on screen when it was decided.
      await flushGuesses();
      const ranked =
        tiebreak.mode === "app-computes"
          ? rankTeamsByGuess(tiebreak.correctAnswer, draftGuesses, tiebreak.contestedTeamIds)
          : [
              manualWinnerId as string,
              ...tiebreak.contestedTeamIds.filter((id) => id !== manualWinnerId),
            ];

      // Fold this attempt's result into the order built up so far, so a
      // re-run between two teams never disturbs anyone already separated.
      const fullOrder = tiebreak.pendingOrder
        ? spliceResolvedOrder(tiebreak.pendingOrder, tiebreak.contestedTeamIds, ranked)
        : ranked;

      // A host judging manually has, by definition, separated them.
      const stillLevel =
        tiebreak.mode === "app-computes"
          ? detectDeadHeats(tiebreak.correctAnswer, draftGuesses, ranked)
          : [];
      const queue = [...stillLevel, ...(tiebreak.pendingDeadHeats ?? [])];

      if (queue.length > 0 && (await runDecider(queue[0], fullOrder, queue.slice(1)))) {
        return;
      }

      await applyTiebreakResult(quizId, tiebreak.contestedPosition, fullOrder);
      await endTiebreak(quizId, hostUid);
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Starts another attempt between `stillContested`, using a question
   * this chain hasn't spent yet. Returns false if the bank has nothing
   * left to ask, so the caller can fall back rather than hang.
   */
  async function runDecider(
    stillContested: string[],
    orderSoFar: string[] | null,
    queued: string[][]
  ): Promise<boolean> {
    const spent = tiebreak.usedQuestionIds ?? [];
    const available = (tiebreakQuestions ?? []).filter((q) => !spent.includes(q.id));
    if (available.length === 0) return false;

    const next = available[Math.floor(Math.random() * available.length)];
    await startTiebreak(
      quizId,
      hostUid,
      next.question,
      next.answer,
      tiebreak.contestedPosition,
      stillContested,
      tiebreak.mode,
      {
        attempt: (tiebreak.attempt ?? 1) + 1,
        pendingOrder: orderSoFar,
        pendingDeadHeats: queued,
        usedQuestionIds: [...spent, next.id],
      }
    );
    return true;
  }

  /**
   * Manual mode's escape hatch: the host has looked at the paper answers
   * and can't split them either - both wrote the same thing, or both are
   * equally wrong. Runs a fresh question between the same teams.
   *
   * Nothing new has been established, so the order built up so far is
   * carried through untouched rather than being guessed at.
   */
  async function declareDeadHeat() {
    setIsSaving(true);
    try {
      await runDecider(
        tiebreak.contestedTeamIds,
        tiebreak.pendingOrder ?? null,
        tiebreak.pendingDeadHeats ?? []
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell
      actions={
        <Button onClick={() => endTiebreak(quizId, hostUid)}>Back to Leaderboard</Button>
      }
    >
      <PageHeader
        eyebrow={`${tiebreak.contestedPosition === "top" ? "1st / 2nd / 3rd" : "2nd-to-last"} tiebreak`}
        title={(tiebreak.attempt ?? 1) > 1 ? `Decider ${tiebreak.attempt}` : "Tiebreak"}
        description={
          (tiebreak.attempt ?? 1) > 1
            ? "The last question couldn't separate these teams, so here's a fresh one between just them."
            : undefined
        }
      />

      <ScreenFrame className="mb-6 p-8 text-center">
        <p className="font-display text-2xl font-semibold text-balance text-ink">
          {tiebreak.questionText}
        </p>
        {tiebreak.revealed && (
          <p className="font-display mt-4 text-xl font-bold text-gold">
            Answer: {tiebreak.correctAnswer}
          </p>
        )}
      </ScreenFrame>

      {tiebreak.mode === "app-computes" ? (
        <TiebreakGuessList
          contestedTeams={contestedTeams}
          guesses={draftGuesses}
          levelTeamIds={levelTeamIds}
          winnerId={winnerId}
          revealed={tiebreak.revealed}
          correctAnswer={tiebreak.correctAnswer}
          onGuessChange={updateGuess}
          onReveal={() => revealTiebreak(quizId, hostUid, tiebreak)}
        />
      ) : (
        <TiebreakWinnerPicker
          contestedTeams={contestedTeams}
          winnerId={winnerId}
          revealed={tiebreak.revealed}
          onPick={setManualWinnerId}
          onReveal={() => revealTiebreak(quizId, hostUid, tiebreak)}
          onDeclareDeadHeat={declareDeadHeat}
          isSaving={isSaving}
          followUpsAvailable={followUpsAvailable}
        />
      )}

      {tiebreak.revealed && (
        <div className="mt-6 border-t border-edge pt-5">
          {deadHeats.length > 0 && (
            <p className="mb-3 rounded-panel border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-ink">
              <span className="font-display font-semibold tracking-wide text-danger uppercase">
                Dead heat
              </span>
              <br />
              {deadHeats
                .map((group) =>
                  group
                    .map((teamId) => teams.find((team) => team.id === teamId)?.name ?? "?")
                    .join(" and ")
                )
                .join("; ")}{" "}
              — exactly as close as each other, so nobody has won yet.
              {followUpsAvailable > 0
                ? " Confirming pulls a fresh question and runs a decider between just them."
                : " Add more tiebreak questions to the bank to run a decider."}
            </p>
          )}

          <Button variant="primary" size="lg" disabled={!canProceed || isSaving} onClick={confirmResult}>
            {isSaving
              ? "Saving…"
              : deadHeats.length > 0
                ? "Run a decider"
                : "Confirm result & finish"}
          </Button>

          <p className="mt-2 text-xs text-ink-muted">
            {!tiebreak.revealed
              ? null
              : deadHeats.length > 0
                ? followUpsAvailable > 0
                  ? `${followUpsAvailable} unused question${followUpsAvailable === 1 ? "" : "s"} left in the bank.`
                  : "No unused questions left — nothing to run a decider with."
                : canProceed
                  ? "Records the placing and returns to the leaderboard, where the prize badge will appear."
                  : tiebreak.mode === "manual"
                    ? "Pick the winning team above first."
                    : "Enter every team's guess above first."}
          </p>
        </div>
      )}
    </AppShell>
  );
}
