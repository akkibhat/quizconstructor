"use client";

import { use, useState } from "react";

import { CodeGateLoading, CodeNotFound } from "@/components/CodeGateStatus";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChipToggle } from "@/components/ui/ChipToggle";
import { fieldStyles } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { useLiveState } from "@/lib/hooks/useLiveState";
import { useMyTeam } from "@/lib/hooks/useMyTeam";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useRounds } from "@/lib/hooks/useRounds";
import { useSlideList } from "@/lib/hooks/useSlideList";
import { useTeamAnswers } from "@/lib/hooks/useTeamAnswers";
import { submitAnswer } from "@/lib/teamAnswers";
import { InvalidRecoveryCodeError, reclaimTeam } from "@/lib/teamRecovery";
import { registerTeamSelfService } from "@/lib/teams";
import { realRoundsOf } from "@/lib/types/round";

/**
 * One shared mobile-first screen for the whole /answer/[code] experience:
 * shows a join form until this device owns a team (see useMyTeam), then
 * flips to the live-answering view. Deliberately one URL rather than a
 * separate /join route - a host sharing this link only has one QR code
 * to hand out, and a team never has to navigate between two pages.
 */
function AnswerScreen({ code }: { code: string }) {
  const quiz = useQuizByCode(code);
  const rounds = useRounds(quiz?.id);
  const myTeam = useMyTeam(quiz?.id);
  const liveState = useLiveState(quiz?.id);
  const slides = useSlideList(quiz);
  const teamAnswers = useTeamAnswers(quiz?.id, myTeam?.id);
  // Shown once, right after joining, so the code isn't lost the instant
  // useMyTeam's subscription resolves and would otherwise flip straight
  // to the answering view - see JoinForm's onJoined.
  const [justJoinedCode, setJustJoinedCode] = useState<string | null>(null);

  if (quiz === undefined) {
    return <CodeGateLoading variant="screen" />;
  }
  if (quiz === null) {
    return <CodeNotFound code={code} variant="screen" />;
  }

  if (!quiz.allowsPhoneAnswering) {
    return (
      <ScreenWrap>
        <p className="font-display text-xl font-semibold text-ink">Phone answering isn&apos;t on</p>
        <p className="mt-2 text-sm text-ink-muted">
          This quiz isn&apos;t using phone-based answering tonight - grab a paper answer sheet from
          the host instead.
        </p>
      </ScreenWrap>
    );
  }

  if (myTeam === undefined || rounds === undefined) {
    return <CodeGateLoading variant="screen" />;
  }

  if (myTeam === null) {
    if (justJoinedCode) {
      return (
        <ScreenWrap>
          <RecoveryCodeConfirm code={justJoinedCode} onContinue={() => setJustJoinedCode(null)} />
        </ScreenWrap>
      );
    }
    if (quiz.status !== "setup") {
      return (
        <ScreenWrap>
          <p className="font-display text-xl font-semibold text-ink">Signup&apos;s closed</p>
          <p className="mt-2 text-sm text-ink-muted">
            This quiz has already started, so new teams can&apos;t join. If you already registered
            on a different phone, use &quot;Recover your team&quot; below instead.
          </p>
          <RecoverLink className="mt-6" />
        </ScreenWrap>
      );
    }
    return (
      <ScreenWrap>
        <JoinForm
          quizId={quiz.id}
          realRounds={realRoundsOf(rounds)}
          picksPerTeam={quiz.doublePointsEnabled ? quiz.doublePointsPicksPerTeam : 0}
          onJoined={setJustJoinedCode}
        />
        <RecoverLink className="mt-6" />
      </ScreenWrap>
    );
  }

  return (
    <ScreenWrap>
      <p className="mb-4 flex items-center justify-between gap-2">
        <span className="font-display text-lg font-semibold text-ink">{myTeam.name}</span>
        <Badge tone="mint">Connected</Badge>
      </p>

      {liveState === undefined || slides === undefined ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : liveState === null || liveState.mode !== "presenter" ? (
        <WaitingCard />
      ) : (
        (() => {
          const slide = slides[liveState.slideIndex];
          if (!slide || slide.type !== "question") {
            return <WaitingCard />;
          }
          return (
            <AnswerCard
              quizId={quiz.id}
              teamId={myTeam.id}
              slideIndex={liveState.slideIndex}
              questionId={slide.questionId}
              text={slide.text}
              flavourLabel={slide.flavourLabel}
              options={slide.options}
              alreadySubmitted={
                teamAnswers?.[slide.questionId]?.submittedAtSlideIndex === liveState.slideIndex
                  ? (teamAnswers[slide.questionId].text ?? null)
                  : null
              }
            />
          );
        })()
      )}
    </ScreenWrap>
  );
}

function ScreenWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-backdrop px-4 py-8">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function WaitingCard() {
  return (
    <Panel className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="font-display text-lg font-semibold text-ink">Waiting…</p>
      <p className="text-sm text-ink-muted">The next question will show up here as soon as it&apos;s live.</p>
    </Panel>
  );
}

/**
 * Shown once, immediately after joining - the ONLY time this code is ever
 * displayed, since it isn't stored anywhere the app could show it again
 * later (see the security-model note on teamRecoveryCodes in
 * firestore.rules for why). Blocks the natural flip to the answering view
 * until dismissed, specifically so it can't be missed.
 */
function RecoveryCodeConfirm({ code, onContinue }: { code: string; onContinue: () => void }) {
  return (
    <Panel className="space-y-4 text-center">
      <p className="font-display text-lg font-semibold text-ink">You&apos;re in!</p>
      <div>
        <p className="text-sm text-ink-muted">
          If your phone dies or you need to switch devices mid-quiz, this code gets your team back:
        </p>
        <p className="font-display mt-2 text-3xl font-bold tracking-[0.2em] text-flame">{code}</p>
      </div>
      <Button variant="primary" size="lg" onClick={onContinue} className="w-full">
        Got it
      </Button>
    </Panel>
  );
}

/** Toggles an inline recovery form open - self-contained so both places that offer it don't duplicate the state. */
function RecoverLink({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn("text-center text-sm text-ink-muted underline hover:text-ink-soft", className)}
      >
        Already registered on another phone? Recover your team
      </button>
    );
  }

  return <RecoverForm className={className} onCancel={() => setIsOpen(false)} />;
}

function RecoverForm({ className, onCancel }: { className?: string; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await reclaimTeam(code);
      // No local state update needed - useMyTeam picks the reclaimed team
      // up automatically once its ownerUid write lands, same as a fresh join.
    } catch (err) {
      setError(err instanceof InvalidRecoveryCodeError ? err.message : "Something went wrong - try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Recovery code"
          className={cn(fieldStyles, "flex-1 font-mono text-sm uppercase")}
          autoFocus
        />
        <Button type="submit" disabled={!code.trim() || isSubmitting}>
          {isSubmitting ? "…" : "Recover"}
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button type="button" onClick={onCancel} className="text-xs text-ink-muted underline">
        Cancel
      </button>
    </form>
  );
}

function JoinForm({
  quizId,
  realRounds,
  picksPerTeam,
  onJoined,
}: {
  quizId: string;
  realRounds: { id: string; title: string }[];
  picksPerTeam: number;
  onJoined: (recoveryCode: string) => void;
}) {
  const [name, setName] = useState("");
  const [selectedRoundIds, setSelectedRoundIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsPicks = picksPerTeam > 0;
  const picksValid = !needsPicks || selectedRoundIds.length === picksPerTeam;
  const canSubmit = name.trim().length > 0 && picksValid && !isSubmitting;

  function toggleRound(roundId: string) {
    setSelectedRoundIds((current) => {
      if (current.includes(roundId)) {
        return current.filter((id) => id !== roundId);
      }
      if (current.length >= picksPerTeam) {
        return [...current.slice(1), roundId];
      }
      return [...current, roundId];
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const { recoveryCode } = await registerTeamSelfService(
        quizId,
        name.trim(),
        needsPicks ? selectedRoundIds : []
      );
      onJoined(recoveryCode);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="font-display mb-1 text-xl font-semibold text-ink">Join the quiz</p>
        <p className="text-sm text-ink-muted">One phone per team - whoever registers here is who submits your answers.</p>
      </div>

      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Team name"
        className={cn(fieldStyles, "text-base")}
        autoFocus
      />

      {needsPicks && (
        <div>
          <p className="mb-2.5 text-sm text-ink-muted">
            Pick {picksPerTeam} double-points round{picksPerTeam === 1 ? "" : "s"} —{" "}
            <span className={cn("font-semibold tabular-nums", picksValid ? "text-flame" : "text-ink-soft")}>
              {selectedRoundIds.length}/{picksPerTeam}
            </span>{" "}
            selected
          </p>
          <div className="flex flex-wrap gap-2">
            {realRounds.map((round) => (
              <ChipToggle key={round.id} selected={selectedRoundIds.includes(round.id)} onClick={() => toggleRound(round.id)}>
                {round.title}
              </ChipToggle>
            ))}
          </div>
        </div>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={!canSubmit} className="w-full">
        {isSubmitting ? "Joining…" : "Join"}
      </Button>
    </form>
  );
}

function AnswerCard({
  quizId,
  teamId,
  slideIndex,
  questionId,
  text,
  flavourLabel,
  options,
  alreadySubmitted,
}: {
  quizId: string;
  teamId: string;
  slideIndex: number;
  questionId: string;
  text: string;
  flavourLabel: string;
  options: string[];
  // The team's own previously-submitted answer for THIS slide, or null if
  // they haven't answered yet.
  alreadySubmitted: string | null;
}) {
  const [draft, setDraft] = useState(alreadySubmitted ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A fresh question (new questionId) always starts blank, even if this
  // component instance is reused - draft shouldn't carry over from the
  // previous question just because React didn't remount it. Synced
  // during render rather than in an effect (the codebase's established
  // way around the react-hooks/set-state-in-effect rule) since this is
  // adjusting state from a prop change, not reacting to an external system.
  const [syncedFor, setSyncedFor] = useState(questionId);
  if (questionId !== syncedFor) {
    setSyncedFor(questionId);
    setDraft(alreadySubmitted ?? "");
  }

  async function handleSubmit(value: string) {
    if (!value.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitAnswer(quizId, teamId, questionId, value, slideIndex);
      setDraft(value);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isAnswered = alreadySubmitted !== null && alreadySubmitted === draft;

  return (
    <Panel className="space-y-4">
      <p className="font-display text-xs font-semibold tracking-widest text-flame uppercase">{flavourLabel}</p>
      <p className="text-lg text-ink">{text}</p>

      {options.length > 0 ? (
        <div className="grid gap-2">
          {options.map((option, index) => {
            const letter = String.fromCharCode(65 + index);
            const selected = draft === option;
            return (
              <button
                key={option}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(option)}
                className={cn(
                  "flex items-center gap-3 rounded-panel border px-4 py-3 text-left text-sm transition-colors",
                  selected ? "border-flame bg-flame/15 text-ink" : "border-edge text-ink-soft hover:border-edge-strong"
                )}
              >
                <span className="font-display font-bold text-flame">{letter}</span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Your answer"
            rows={2}
            className={cn(fieldStyles, "text-base")}
          />
          <Button
            variant="primary"
            size="lg"
            disabled={!draft.trim() || isSubmitting}
            onClick={() => handleSubmit(draft)}
            className="w-full"
          >
            {isSubmitting ? "Submitting…" : "Submit"}
          </Button>
        </div>
      )}

      {isAnswered && <p className="text-center text-xs text-mint">Submitted - you can change it until the next question.</p>}
    </Panel>
  );
}

export default function AnswerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <AnswerScreen code={code} />;
}
