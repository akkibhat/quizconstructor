import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { ContestedPosition, LiveMode, TiebreakMode, TiebreakState } from "@/lib/types/liveState";

function liveStateRef(quizId: string) {
  return doc(db, "quizzes", quizId, "liveState", "current");
}

/**
 * Starts a quiz: creates its liveState doc at slide 0 and flips the quiz's
 * status to "live" - which is also what locks team signups, since team
 * writes require status === "setup" (see firestore.rules).
 */
export async function startQuiz(quizId: string, hostUid: string): Promise<void> {
  await setDoc(liveStateRef(quizId), {
    mode: "presenter",
    slideIndex: 0,
    leaderboardRevealStage: 0,
    tiebreak: null,
    updatedAt: serverTimestamp(),
    updatedBy: hostUid,
  });
  await updateDoc(doc(db, "quizzes", quizId), {
    status: "live",
    updatedAt: serverTimestamp(),
  });
}

async function goToSlide(quizId: string, slideIndex: number, hostUid: string): Promise<void> {
  await updateDoc(liveStateRef(quizId), {
    mode: "presenter",
    slideIndex,
    updatedAt: serverTimestamp(),
    updatedBy: hostUid,
  });
}

export async function goNext(
  quizId: string,
  currentIndex: number,
  slideCount: number,
  hostUid: string
): Promise<void> {
  await goToSlide(quizId, Math.min(currentIndex + 1, slideCount - 1), hostUid);
}

export async function goPrev(quizId: string, currentIndex: number, hostUid: string): Promise<void> {
  await goToSlide(quizId, Math.max(currentIndex - 1, 0), hostUid);
}

export async function setLiveMode(quizId: string, mode: LiveMode, hostUid: string): Promise<void> {
  await updateDoc(liveStateRef(quizId), {
    mode,
    updatedAt: serverTimestamp(),
    updatedBy: hostUid,
  });
}

export async function setLeaderboardRevealStage(
  quizId: string,
  stage: 0 | 1 | 2 | 3,
  hostUid: string
): Promise<void> {
  await updateDoc(liveStateRef(quizId), {
    leaderboardRevealStage: stage,
    updatedAt: serverTimestamp(),
    updatedBy: hostUid,
  });
}

/** Pulls a tiebreak question live: switches Display into tiebreak mode, question hidden-answer-wise until revealed. */
export async function startTiebreak(
  quizId: string,
  hostUid: string,
  questionText: string,
  correctAnswer: number,
  contestedPosition: ContestedPosition,
  contestedTeamIds: string[],
  mode: TiebreakMode
): Promise<void> {
  const tiebreak: TiebreakState = {
    questionText,
    correctAnswer,
    contestedPosition,
    mode,
    contestedTeamIds,
    guesses: {},
    revealed: false,
  };
  await updateDoc(liveStateRef(quizId), {
    mode: "tiebreak",
    tiebreak,
    updatedAt: serverTimestamp(),
    updatedBy: hostUid,
  });
}

/** Records one team's guess in app-computes mode. Takes the current tiebreak state to merge, same pattern as setQuestionMark. */
export async function setTiebreakGuess(
  quizId: string,
  hostUid: string,
  currentTiebreak: TiebreakState,
  teamId: string,
  guess: number
): Promise<void> {
  await updateDoc(liveStateRef(quizId), {
    tiebreak: {
      ...currentTiebreak,
      guesses: { ...currentTiebreak.guesses, [teamId]: guess },
    },
    updatedAt: serverTimestamp(),
    updatedBy: hostUid,
  });
}

/** Reveals the correct answer (and, in app-computes mode, the guesses/winner) on Display. */
export async function revealTiebreak(
  quizId: string,
  hostUid: string,
  currentTiebreak: TiebreakState
): Promise<void> {
  await updateDoc(liveStateRef(quizId), {
    tiebreak: { ...currentTiebreak, revealed: true },
    updatedAt: serverTimestamp(),
    updatedBy: hostUid,
  });
}

/** Returns to the leaderboard - the tiebreak state is left in place (not cleared) in case the host wants to glance back at it. */
export async function endTiebreak(quizId: string, hostUid: string): Promise<void> {
  await setLiveMode(quizId, "leaderboard", hostUid);
}
