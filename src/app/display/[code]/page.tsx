"use client";

import { QRCodeSVG } from "qrcode.react";
import { use } from "react";

import { CodeGateLoading, CodeNotFound } from "@/components/CodeGateStatus";
import { LeaderboardView } from "@/components/LeaderboardView";
import { ScreenFrame } from "@/components/ui/ScreenFrame";
import { SlideView } from "@/components/SlideView";
import { cn } from "@/lib/cn";
import { useAnswersForQuestion } from "@/lib/hooks/useAnswersForQuestion";
import { useLeaderboardTotals } from "@/lib/hooks/useLeaderboardTotals";
import { useLiveState } from "@/lib/hooks/useLiveState";
import { useQuizByCode } from "@/lib/hooks/useQuizByCode";
import { useSlideList } from "@/lib/hooks/useSlideList";
import { useTeams } from "@/lib/hooks/useTeams";
import { computeTiebreakWinner } from "@/lib/tieDetection";
import type { TeamAnswer } from "@/lib/types/teamAnswer";
import type { TiebreakState } from "@/lib/types/liveState";
import type { Quiz } from "@/lib/types/quiz";
import type { Team } from "@/lib/types/team";

/**
 * Optional (Quiz.allowsLiveAnswerReveal), shown alongside the normal
 * answer-reveal slide - a frequency tally of what teams actually
 * submitted, grouped by trimmed/lowercased text so "Paris" and "paris"
 * count together, most-common first. Deliberately doesn't know or care
 * whether the question was option-based or free-text - a raw text
 * frequency count reads fine either way, and it means this needs no
 * separate lookup of the question's flavour at all.
 */
function AnswerRevealTally({ answers }: { answers: Record<string, TeamAnswer> }) {
  const counts = new Map<string, number>();
  for (const answer of Object.values(answers)) {
    const key = answer.text.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) return null;

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-2.5">
      {sorted.map(([text, count]) => (
        <span
          key={text}
          className="rounded-chip border border-edge-strong bg-surface px-4 py-2 text-xl text-ink"
        >
          {text} <span className="text-flame tabular-nums">×{count}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * Shown while waiting for the host to press Start, when phone answering
 * is on - a scan-to-join QR (same pattern the admin dashboard's Live
 * Links already use) plus a live-updating list of teams as they
 * self-register, so the room can see themselves show up on the big
 * screen. Only rendered when there's something to scan into.
 */
function JoinPrompt({ quiz, teams }: { quiz: Quiz; teams: Team[] | undefined }) {
  // Safe to read window directly - see the identical comment on
  // LiveLinksSection in admin/quizzes/[quizId]/page.tsx for why.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/answer/${quiz.code}`;

  return (
    <div className="mt-10 flex flex-col items-center gap-5">
      {origin && (
        <div className="rounded-panel bg-ink p-3">
          <QRCodeSVG value={joinUrl} size={160} bgColor="#f9f0dd" fgColor="#0a2b2c" />
        </div>
      )}
      <p className="font-display text-lg tracking-[0.15em] text-ink-muted uppercase">
        Scan to join on your phone
      </p>
      {teams && teams.length > 0 && (
        <div className="flex max-w-2xl flex-wrap justify-center gap-2">
          {teams.map((team) => (
            <span
              key={team.id}
              className="rounded-chip border border-edge-strong bg-surface px-3 py-1.5 text-lg text-ink"
            >
              {team.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TiebreakDisplay({ tiebreak, teams }: { tiebreak: TiebreakState; teams: Team[] }) {
  const contestedTeams = tiebreak.contestedTeamIds
    .map((teamId) => teams.find((team) => team.id === teamId))
    .filter((team): team is Team => Boolean(team));
  const winnerId =
    tiebreak.mode === "app-computes" && tiebreak.revealed
      ? computeTiebreakWinner(tiebreak.correctAnswer, tiebreak.guesses)
      : null;

  return (
    <div className="w-full max-w-3xl text-center">
      <p className="font-display mb-5 text-xl font-semibold tracking-[0.3em] text-flame uppercase">
        {tiebreak.contestedPosition === "top" ? "1st / 2nd / 3rd" : "2nd-to-last"} Tiebreak
      </p>
      <p className="font-display mb-10 text-5xl leading-tight font-semibold text-balance text-ink">
        {tiebreak.questionText}
      </p>

      {tiebreak.revealed && (
        <>
          <p className="font-display mb-8 text-4xl font-bold text-gold">
            Answer: {tiebreak.correctAnswer}
          </p>
          {tiebreak.mode === "app-computes" && (
            <ul className="space-y-2.5 text-left">
              {contestedTeams.map((team) => {
                const isWinner = winnerId === team.id;
                return (
                  <li
                    key={team.id}
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-panel border px-6 py-4",
                      isWinner ? "border-flame-bright bg-flame edge-dark" : "border-edge bg-surface"
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-3 text-2xl",
                        isWinner ? "font-semibold text-on-flame" : "text-ink"
                      )}
                    >
                      {team.name}
                      {isWinner && (
                        <span className="rounded-chip bg-on-flame/20 px-2 py-0.5 text-xs font-bold tracking-wider text-on-flame uppercase">
                          Winner
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "font-display text-2xl font-bold tabular-nums",
                        isWinner ? "text-on-flame" : "text-ink-muted"
                      )}
                    >
                      {tiebreak.guesses[team.id] ?? "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// Code-only, no login required - this is what's projected on the screen
// for the whole room to see. See the plan doc's quiz access model for why
// that's an intentional, accepted tradeoff.
function DisplayContent({ code }: { code: string }) {
  const quiz = useQuizByCode(code);
  const slides = useSlideList(quiz);
  const liveState = useLiveState(quiz?.id);
  const leaderboard = useLeaderboardTotals(quiz?.id);
  const teams = useTeams(quiz?.id);

  // Only meaningful on an "answer" slide with the reveal opted in - the
  // hook no-ops (returns undefined) otherwise, same pattern as Controller's
  // identical "X of Y answered" usage of this hook.
  const currentSlideForReveal = slides && liveState ? slides[liveState.slideIndex] : undefined;
  const showsReveal =
    Boolean(quiz?.allowsPhoneAnswering) &&
    Boolean(quiz?.allowsLiveAnswerReveal) &&
    currentSlideForReveal?.type === "answer";
  const revealAnswers = useAnswersForQuestion(
    quiz?.id,
    (teams ?? []).map((team) => team.id),
    showsReveal && currentSlideForReveal?.type === "answer" ? currentSlideForReveal.questionId : undefined
  );

  if (quiz === undefined) {
    return <CodeGateLoading variant="screen" />;
  }

  if (quiz === null) {
    return <CodeNotFound code={code} variant="screen" />;
  }

  if (liveState === undefined || slides === undefined) {
    return <CodeGateLoading variant="screen" />;
  }

  if (liveState === null) {
    return (
      <div className="text-center">
        <p className="font-display text-7xl font-bold text-balance text-ink">{quiz.title}</p>
        <p className="font-display mt-6 text-2xl tracking-[0.2em] text-flame uppercase">
          Waiting for the host…
        </p>
        {quiz.allowsPhoneAnswering && <JoinPrompt quiz={quiz} teams={teams} />}
      </div>
    );
  }

  if (liveState.mode === "leaderboard") {
    if (leaderboard === undefined) {
      return <CodeGateLoading variant="screen" />;
    }
    return <LeaderboardView entries={leaderboard} revealStage={liveState.leaderboardRevealStage} />;
  }

  if (liveState.mode === "drinks-break") {
    return (
      <div className="text-center">
        <h1 className="font-display text-8xl font-bold tracking-wide text-ink uppercase">
          Drinks Break
        </h1>
        <p className="font-display mt-6 text-2xl tracking-[0.2em] text-flame uppercase">
          Back shortly
        </p>
      </div>
    );
  }

  if (liveState.mode === "tiebreak" && liveState.tiebreak) {
    if (teams === undefined) {
      return <CodeGateLoading variant="screen" />;
    }
    return <TiebreakDisplay tiebreak={liveState.tiebreak} teams={teams} />;
  }

  return (
    <div className="flex flex-col items-center">
      <SlideView slide={slides[liveState.slideIndex]} />
      {showsReveal && revealAnswers && <AnswerRevealTally answers={revealAnswers} />}
    </div>
  );
}

export default function DisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return (
    // The projector is framed as a period TV set: a thin warm border
    // around an inset screen with a pool of light at the top. Everything
    // the room sees renders inside that frame.
    <div className="flex min-h-screen items-center justify-center bg-backdrop p-5">
      <ScreenFrame className="flex min-h-[calc(100vh-2.5rem)] w-full items-center justify-center p-12">
        <DisplayContent code={code} />
      </ScreenFrame>
    </div>
  );
}
