"use client";

import { use, useEffect, useRef, useState } from "react";

import { LeaderboardView } from "@/components/LeaderboardView";
import { RequireAuth } from "@/components/RequireAuth";
import { SlideView } from "@/components/SlideView";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeaderboardTotals } from "@/lib/hooks/useLeaderboardTotals";
import { useLiveState } from "@/lib/hooks/useLiveState";
import { useMediaUrl } from "@/lib/hooks/useMediaUrl";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useSlideList } from "@/lib/hooks/useSlideList";
import { useTeams } from "@/lib/hooks/useTeams";
import { useTiebreakQuestions } from "@/lib/hooks/useTiebreakQuestions";
import {
  endTiebreak,
  goNext,
  goPrev,
  revealTiebreak,
  setLeaderboardRevealStage,
  setLiveMode,
  setTiebreakGuess,
  startQuiz,
  startTiebreak,
} from "@/lib/liveState";
import { computeTiebreakWinner, detectTiedPositions, type TieGroup } from "@/lib/tieDetection";
import type { AudioPlayMode } from "@/lib/types/question";
import type { TiebreakMode, TiebreakState } from "@/lib/types/liveState";
import type { TiebreakQuestion } from "@/lib/types/tiebreakQuestion";
import type { Team } from "@/lib/types/team";

/**
 * Play/pause/stop for a question's attached audio. Playback is local to
 * this component only - never synced through Firestore - since the host's
 * own laptop is what's physically wired to the venue's speakers regardless
 * of which window (Controller or Display) triggers it. See the plan doc's
 * Slide-List Engine section for the full reasoning.
 */
function AudioControls({
  audioPath,
  audioPlayMode,
}: {
  audioPath: string;
  audioPlayMode: AudioPlayMode;
}) {
  const audioUrl = useMediaUrl(audioPath);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (audioPlayMode === "autoplay" && audioUrl) {
      audioRef.current?.play();
    }
  }, [audioPlayMode, audioUrl]);

  if (!audioUrl) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded border border-neutral-800 bg-neutral-900 px-4 py-2">
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <button
        type="button"
        onClick={() => (isPlaying ? audioRef.current?.pause() : audioRef.current?.play())}
        className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
        }}
        className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
      >
        Stop
      </button>
      <span className="text-xs text-neutral-500">
        {audioPlayMode === "autoplay" ? "Autoplay" : "Manual"}
      </span>
    </div>
  );
}

/**
 * Flags any ties at a contested position (1st/2nd/3rd or 2nd-to-last -
 * see detectTiedPositions) and lets the host pick a tiebreak question from
 * the bank plus a resolution mode to kick off startTiebreak.
 */
function TieAlertBanner({
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
        <div key={index} className="rounded border border-red-800 bg-red-950/30 p-3 text-sm">
          <p className="text-red-300">
            Tie for {group.position === "top" ? "1st/2nd/3rd" : "2nd-to-last"}:{" "}
            {group.teams.map((team) => team.name).join(", ")} (all {group.score} pts)
          </p>
          {resolvingIndex === index ? (
            <div className="mt-3 space-y-2">
              <select
                value={selectedQuestionId}
                onChange={(event) => setSelectedQuestionId(event.target.value)}
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
              >
                <option value="">Pick a tiebreak question…</option>
                {tiebreakQuestions?.map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.question}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-4 text-neutral-300">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={mode === "app-computes"}
                    onChange={() => setMode("app-computes")}
                  />
                  App computes winner
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={mode === "manual"}
                    onChange={() => setMode("manual")}
                  />
                  I&apos;ll judge manually
                </label>
              </div>
              <button
                type="button"
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
                    mode
                  );
                  setResolvingIndex(null);
                  setSelectedQuestionId("");
                }}
                className="rounded bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 disabled:opacity-50"
              >
                Start Tiebreak
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setResolvingIndex(index)}
              className="mt-2 rounded border border-red-700 px-3 py-1 text-xs text-red-300"
            >
              Resolve Tie
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Runs the active tiebreak: shows the question, collects guesses or reveals the answer, and (in app-computes mode) the winner. */
function TiebreakPanel({
  quizId,
  hostUid,
  tiebreak,
  teams,
}: {
  quizId: string;
  hostUid: string;
  tiebreak: TiebreakState;
  teams: Team[];
}) {
  const contestedTeams = tiebreak.contestedTeamIds
    .map((teamId) => teams.find((team) => team.id === teamId))
    .filter((team): team is Team => Boolean(team));
  const winnerId =
    tiebreak.mode === "app-computes" && tiebreak.revealed
      ? computeTiebreakWinner(tiebreak.correctAnswer, tiebreak.guesses)
      : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-100">Tiebreak</h1>
        <button
          type="button"
          onClick={() => endTiebreak(quizId, hostUid)}
          className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
        >
          Back to Leaderboard
        </button>
      </div>

      <div className="mb-6 rounded border border-neutral-800 bg-black p-6 text-center">
        <p className="mb-2 text-xs tracking-widest text-neutral-500 uppercase">
          {tiebreak.contestedPosition === "top" ? "1st / 2nd / 3rd" : "2nd-to-last"} tiebreak
        </p>
        <p className="text-xl text-neutral-100">{tiebreak.questionText}</p>
        {tiebreak.revealed && (
          <p className="mt-3 text-lg text-emerald-400">Answer: {tiebreak.correctAnswer}</p>
        )}
      </div>

      {tiebreak.mode === "app-computes" ? (
        <div className="space-y-2">
          {contestedTeams.map((team) => (
            <div
              key={team.id}
              className={`flex items-center justify-between rounded border p-3 ${
                winnerId === team.id
                  ? "border-emerald-700 bg-emerald-950/30"
                  : "border-neutral-800 bg-neutral-900"
              }`}
            >
              <span className="text-neutral-100">
                {team.name}
                {winnerId === team.id && (
                  <span className="ml-2 text-xs text-emerald-400">Winner</span>
                )}
              </span>
              <input
                type="number"
                defaultValue={tiebreak.guesses[team.id] ?? ""}
                onBlur={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isNaN(value)) {
                    setTiebreakGuess(quizId, hostUid, tiebreak, team.id, value);
                  }
                }}
                className="w-32 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
                placeholder="Guess"
              />
            </div>
          ))}
          {!tiebreak.revealed && (
            <button
              type="button"
              onClick={() => revealTiebreak(quizId, hostUid, tiebreak)}
              className="mt-2 rounded bg-neutral-100 px-4 py-2 font-medium text-neutral-900"
            >
              Reveal Winner
            </button>
          )}
        </div>
      ) : (
        <div>
          <ul className="mb-4 space-y-1 text-sm text-neutral-400">
            {contestedTeams.map((team) => (
              <li key={team.id}>{team.name}</li>
            ))}
          </ul>
          {!tiebreak.revealed && (
            <button
              type="button"
              onClick={() => revealTiebreak(quizId, hostUid, tiebreak)}
              className="rounded bg-neutral-100 px-4 py-2 font-medium text-neutral-900"
            >
              Reveal Answer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ControllerContent({ code }: { code: string }) {
  const { user } = useAuth();
  const quiz = useQuizByCode(code);
  const slides = useSlideList(quiz);
  const liveState = useLiveState(quiz?.id);
  const leaderboard = useLeaderboardTotals(quiz?.id);
  const teams = useTeams(quiz?.id);
  const tiebreakQuestions = useTiebreakQuestions();

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
    return <p className="p-10 text-neutral-400">Loading…</p>;
  }

  if (quiz === null) {
    return <p className="p-10 text-neutral-400">No quiz found for code &quot;{code}&quot;.</p>;
  }

  if (slides === undefined || liveState === undefined) {
    return <p className="p-10 text-neutral-400">Loading…</p>;
  }

  if (liveState === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="mb-6 text-2xl font-semibold text-neutral-100">{quiz.title}</h1>
        <button
          type="button"
          onClick={() => startQuiz(quiz.id, user.uid)}
          className="rounded bg-neutral-100 px-6 py-3 font-medium text-neutral-900"
        >
          Start Quiz
        </button>
      </div>
    );
  }

  if (liveState.mode === "tiebreak" && liveState.tiebreak) {
    if (teams === undefined) {
      return <p className="p-10 text-neutral-400">Loading…</p>;
    }
    return (
      <TiebreakPanel quizId={quiz.id} hostUid={user.uid} tiebreak={liveState.tiebreak} teams={teams} />
    );
  }

  if (liveState.mode === "drinks-break") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-medium text-neutral-100">{quiz.title}</h1>
          <button
            type="button"
            onClick={() => setLiveMode(quiz.id, "presenter", user.uid)}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
          >
            Back to Quiz
          </button>
        </div>
        <div className="flex min-h-[200px] items-center justify-center rounded border border-neutral-800 bg-black p-8">
          <h2 className="text-3xl font-bold text-neutral-100">Drinks Break</h2>
        </div>
      </div>
    );
  }

  if (liveState.mode === "leaderboard") {
    if (leaderboard === undefined) {
      return <p className="p-10 text-neutral-400">Loading…</p>;
    }

    const stage = liveState.leaderboardRevealStage;
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-medium text-neutral-100">{quiz.title}</h1>
          <button
            type="button"
            onClick={() => setLiveMode(quiz.id, "presenter", user.uid)}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
          >
            Back to Quiz
          </button>
        </div>

        {stage === 3 && (
          <TieAlertBanner
            quizId={quiz.id}
            hostUid={user.uid}
            tieGroups={detectTiedPositions(leaderboard)}
            tiebreakQuestions={tiebreakQuestions}
          />
        )}

        <div className="mb-6 flex justify-center rounded border border-neutral-800 bg-black p-8">
          <LeaderboardView entries={leaderboard} revealStage={stage} />
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={stage === 0}
            onClick={() =>
              setLeaderboardRevealStage(quiz.id, (stage - 1) as 0 | 1 | 2 | 3, user.uid)
            }
            className="rounded border border-neutral-700 px-4 py-2 text-neutral-300 disabled:opacity-30"
          >
            ← Reveal less
          </button>
          <button
            type="button"
            disabled={stage === 3}
            onClick={() =>
              setLeaderboardRevealStage(quiz.id, (stage + 1) as 0 | 1 | 2 | 3, user.uid)
            }
            className="rounded bg-neutral-100 px-4 py-2 font-medium text-neutral-900 disabled:opacity-30"
          >
            Reveal next →
          </button>
          <span className="text-xs text-neutral-600">(or use arrow keys)</span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={stage === 0}
            onClick={() => setLeaderboardRevealStage(quiz.id, 0, user.uid)}
            className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-30"
          >
            Hide all
          </button>
          <button
            type="button"
            disabled={stage === 3}
            onClick={() => setLeaderboardRevealStage(quiz.id, 3, user.uid)}
            className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-30"
          >
            Show all now (skip the reveal)
          </button>
        </div>
      </div>
    );
  }

  const currentSlide = slides[liveState.slideIndex];
  const nextSlide = slides[liveState.slideIndex + 1];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-100">{quiz.title}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLiveMode(quiz.id, "drinks-break", user.uid)}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
          >
            Drinks Break
          </button>
          <button
            type="button"
            onClick={() => setLiveMode(quiz.id, "leaderboard", user.uid)}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
          >
            Go to Leaderboard
          </button>
        </div>
      </div>

      <div className="mb-2 text-xs text-neutral-500">
        Slide {liveState.slideIndex + 1} of {slides.length}
      </div>

      <div className="mb-4 flex min-h-[240px] items-center justify-center rounded border border-neutral-800 bg-black p-8">
        <SlideView slide={currentSlide} />
      </div>

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

      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          disabled={liveState.slideIndex === 0}
          onClick={() => goPrev(quiz.id, liveState.slideIndex, user.uid)}
          className="rounded border border-neutral-700 px-4 py-2 text-neutral-300 disabled:opacity-30"
        >
          ← Previous
        </button>
        <button
          type="button"
          disabled={liveState.slideIndex >= slides.length - 1}
          onClick={() => goNext(quiz.id, liveState.slideIndex, slides.length, user.uid)}
          className="rounded bg-neutral-100 px-4 py-2 font-medium text-neutral-900 disabled:opacity-30"
        >
          Next →
        </button>
        <span className="text-xs text-neutral-600">(or use arrow keys)</span>
      </div>

      {nextSlide && (
        <div className="rounded border border-neutral-900 bg-neutral-950 p-4 opacity-60">
          <p className="mb-2 text-xs text-neutral-500">Next:</p>
          <div className="origin-top-left scale-75">
            <SlideView slide={nextSlide} />
          </div>
        </div>
      )}
    </div>
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
