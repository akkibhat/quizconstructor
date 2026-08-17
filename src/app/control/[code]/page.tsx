"use client";

import { use, useEffect } from "react";

import { CodeGateLoading, CodeNotFound } from "@/components/CodeGateStatus";
import { AudioControls } from "@/components/control/AudioControls";
import { TieAlertBanner } from "@/components/control/TieAlertBanner";
import { TiebreakPanel } from "@/components/control/TiebreakPanel";
import { LeaderboardView } from "@/components/LeaderboardView";
import { RequireAuth } from "@/components/RequireAuth";
import { SlideView } from "@/components/SlideView";
import { AppShell, PageHeader } from "@/components/ui/AppShell";
import { ScreenFrame } from "@/components/ui/ScreenFrame";
import { Button } from "@/components/ui/Button";
import { useAnswersForQuestion } from "@/lib/hooks/useAnswersForQuestion";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeaderboardTotals } from "@/lib/hooks/useLeaderboardTotals";
import { useLiveState } from "@/lib/hooks/useLiveState";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useSlideList } from "@/lib/hooks/useSlideList";
import { useTeams } from "@/lib/hooks/useTeams";
import { useTiebreakQuestions } from "@/lib/hooks/useTiebreakQuestions";
import { goNext, goPrev, setLeaderboardRevealStage, setLiveMode, startQuiz } from "@/lib/liveState";
import { unresolvedTieGroups } from "@/lib/tieDetection";

function ControllerContent({ code }: { code: string }) {
  const { user } = useAuth();
  const quiz = useQuizByCode(code);
  const slides = useSlideList(quiz);
  const liveState = useLiveState(quiz?.id);
  const leaderboard = useLeaderboardTotals(quiz?.id);
  const teams = useTeams(quiz?.id);
  const tiebreakQuestions = useTiebreakQuestions();

  // Only meaningful while a question slide is actually showing - the hook
  // itself no-ops (returns undefined) when questionId is undefined, so
  // this is safe to call unconditionally with "current slide, if it's a
  // question" rather than needing its own early-return dance. teamIds is
  // rebuilt every render, which is fine - the hook keys its effect off the
  // joined string, not array identity, so a fresh array each render
  // doesn't restart the N listeners underneath it.
  const currentSlideForAnswers = slides && liveState ? slides[liveState.slideIndex] : undefined;
  const currentQuestionId =
    currentSlideForAnswers?.type === "question" ? currentSlideForAnswers.questionId : undefined;
  const answersForCurrentQuestion = useAnswersForQuestion(
    quiz?.id,
    (teams ?? []).map((team) => team.id),
    currentQuestionId
  );

  // Arrow-key shortcuts. In presenter mode they move between slides; in
  // leaderboard mode the same two keys step the progressive reveal
  // forward/backward instead, mirroring whichever button row is showing.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!quiz || !slides || !liveState || !user) return;

      if (liveState.mode === "leaderboard") {
        if (event.key === "ArrowRight") {
          setLeaderboardRevealStage(
            quiz.id,
            Math.min(liveState.leaderboardRevealStage + 1, 3) as 0 | 1 | 2 | 3,
            user.uid
          );
        } else if (event.key === "ArrowLeft") {
          setLeaderboardRevealStage(
            quiz.id,
            Math.max(liveState.leaderboardRevealStage - 1, 0) as 0 | 1 | 2 | 3,
            user.uid
          );
        }
        return;
      }

      // Drinks Break and Tiebreak have their own on-screen controls and no
      // arrow-key shortcuts of their own - without this guard, arrow keys
      // would silently advance the presenter's slideIndex in the
      // background while one of those screens is showing, so returning to
      // "presenter" mode later would jump further than expected.
      if (liveState.mode !== "presenter") {
        return;
      }

      if (event.key === "ArrowRight") {
        goNext(quiz.id, liveState.slideIndex, slides.length, user.uid);
      } else if (event.key === "ArrowLeft") {
        goPrev(quiz.id, liveState.slideIndex, user.uid);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quiz, slides, liveState, user]);

  if (quiz === undefined || !user) {
    return <CodeGateLoading />;
  }

  if (quiz === null) {
    return <CodeNotFound code={code} />;
  }

  if (slides === undefined || liveState === undefined) {
    return <CodeGateLoading />;
  }

  if (liveState === null) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-flame uppercase">
            Ready when you are
          </p>
          <h1 className="font-display mb-8 text-4xl font-bold text-balance text-ink">
            {quiz.title}
          </h1>
          <Button variant="primary" size="lg" onClick={() => startQuiz(quiz.id, user.uid)}>
            Start Quiz
          </Button>
        </div>
      </AppShell>
    );
  }

  if (liveState.mode === "tiebreak" && liveState.tiebreak) {
    if (teams === undefined) {
      return <CodeGateLoading />;
    }
    return (
      <TiebreakPanel
        // Remount on each new decider so the panel's local state - the
        // typed guesses and any manually picked winner - starts empty.
        // Without this, attempt 2 would open pre-filled with attempt 1's
        // numbers and its winner already highlighted.
        key={`${liveState.tiebreak.attempt ?? 1}-${liveState.tiebreak.questionText}`}
        quizId={quiz.id}
        hostUid={user.uid}
        tiebreak={liveState.tiebreak}
        teams={teams}
        tiebreakQuestions={tiebreakQuestions}
      />
    );
  }

  if (liveState.mode === "drinks-break") {
    return (
      <AppShell
        actions={
          <Button variant="primary" onClick={() => setLiveMode(quiz.id, "presenter", user.uid)}>
            Back to Quiz
          </Button>
        }
      >
        <PageHeader eyebrow="On screen" title={quiz.title} />
        <ScreenFrame className="flex min-h-[220px] items-center justify-center p-8">
          <h2 className="font-display text-4xl font-bold tracking-wide text-ink uppercase">
            Drinks Break
          </h2>
        </ScreenFrame>
      </AppShell>
    );
  }

  if (liveState.mode === "leaderboard") {
    if (leaderboard === undefined) {
      return <CodeGateLoading />;
    }

    const stage = liveState.leaderboardRevealStage;
    return (
      <AppShell
        width="wide"
        actions={
          <Button variant="primary" onClick={() => setLiveMode(quiz.id, "presenter", user.uid)}>
            Back to Quiz
          </Button>
        }
      >
        <PageHeader eyebrow="On screen" title={quiz.title} />

        {stage === 3 && (
          <TieAlertBanner
            quizId={quiz.id}
            hostUid={user.uid}
            tieGroups={unresolvedTieGroups(leaderboard)}
            tiebreakQuestions={tiebreakQuestions}
          />
        )}

        <ScreenFrame className="mb-6 flex justify-center p-8">
          <LeaderboardView entries={leaderboard} revealStage={stage} />
        </ScreenFrame>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            disabled={stage === 0}
            onClick={() =>
              setLeaderboardRevealStage(quiz.id, (stage - 1) as 0 | 1 | 2 | 3, user.uid)
            }
          >
            ← Reveal less
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={stage === 3}
            onClick={() =>
              setLeaderboardRevealStage(quiz.id, (stage + 1) as 0 | 1 | 2 | 3, user.uid)
            }
          >
            Reveal next →
          </Button>
          <span className="text-xs text-ink-muted">(or use arrow keys)</span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={stage === 0}
            onClick={() => setLeaderboardRevealStage(quiz.id, 0, user.uid)}
          >
            Hide all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={stage === 3}
            onClick={() => setLeaderboardRevealStage(quiz.id, 3, user.uid)}
          >
            Show all now (skip the reveal)
          </Button>
        </div>
      </AppShell>
    );
  }

  const currentSlide = slides[liveState.slideIndex];
  const nextSlide = slides[liveState.slideIndex + 1];

  return (
    <AppShell
      width="wide"
      actions={
        <>
          <Button onClick={() => setLiveMode(quiz.id, "drinks-break", user.uid)}>
            Drinks Break
          </Button>
          <Button onClick={() => setLiveMode(quiz.id, "leaderboard", user.uid)}>
            Leaderboard
          </Button>
        </>
      }
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-flame uppercase">
            On screen
          </p>
          <h1 className="font-display text-2xl font-semibold text-ink">{quiz.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {quiz.allowsPhoneAnswering && currentSlide?.type === "question" && teams && (
            <span className="font-mono text-sm text-flame tabular-nums">
              {answersForCurrentQuestion ? Object.keys(answersForCurrentQuestion).length : 0}/
              {teams.length} answered
            </span>
          )}
          <span className="font-mono text-sm text-ink-muted tabular-nums">
            Slide {liveState.slideIndex + 1} / {slides.length}
          </span>
        </div>
      </div>

      {/* Scaled down so the projector's real slide layout stays readable
          here without dwarfing the controls underneath it. */}
      <ScreenFrame className="mb-4 flex min-h-[260px] items-center justify-center overflow-hidden p-8">
        <div className="origin-center scale-[0.55]">
          <SlideView slide={currentSlide} />
        </div>
      </ScreenFrame>

      {currentSlide &&
        currentSlide.type === "question" &&
        currentSlide.audioPath &&
        currentSlide.audioPlayMode && (
          <div className="mb-4">
            <AudioControls
              audioPath={currentSlide.audioPath}
              audioPlayMode={currentSlide.audioPlayMode}
            />
          </div>
        )}

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          disabled={liveState.slideIndex === 0}
          onClick={() => goPrev(quiz.id, liveState.slideIndex, user.uid)}
        >
          ← Previous
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={liveState.slideIndex >= slides.length - 1}
          onClick={() => goNext(quiz.id, liveState.slideIndex, slides.length, user.uid)}
        >
          Next →
        </Button>
        <span className="text-xs text-ink-muted">(or use arrow keys)</span>
      </div>

      {nextSlide && (
        <div className="rounded-panel border border-edge bg-surface/50 p-4">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
            Coming up
          </p>
          <div className="flex h-24 items-center justify-center overflow-hidden opacity-70">
            <div className="origin-center scale-[0.32]">
              <SlideView slide={nextSlide} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function ControlPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return (
    <RequireAuth>
      <ControllerContent code={code} />
    </RequireAuth>
  );
}
