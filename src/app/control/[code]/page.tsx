"use client";

import { use, useEffect, useRef, useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { SlideView } from "@/components/SlideView";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLiveState } from "@/lib/hooks/useLiveState";
import { useMediaUrl } from "@/lib/hooks/useMediaUrl";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useSlideList } from "@/lib/hooks/useSlideList";
import { goNext, goPrev, setLiveMode, startQuiz } from "@/lib/liveState";
import type { AudioPlayMode } from "@/lib/types/question";

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

function ControllerContent({ code }: { code: string }) {
  const { user } = useAuth();
  const quiz = useQuizByCode(code);
  const slides = useSlideList(quiz);
  const liveState = useLiveState(quiz?.id);

  // Arrow-key shortcuts, mirroring the Next/Previous buttons below.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!quiz || !slides || !liveState || !user) return;
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

  const currentSlide = slides[liveState.slideIndex];
  const nextSlide = slides[liveState.slideIndex + 1];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-100">{quiz.title}</h1>
        <button
          type="button"
          onClick={() =>
            setLiveMode(
              quiz.id,
              liveState.mode === "presenter" ? "leaderboard" : "presenter",
              user.uid
            )
          }
          className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
        >
          {liveState.mode === "presenter" ? "Go to Leaderboard" : "Back to Quiz"}
        </button>
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
