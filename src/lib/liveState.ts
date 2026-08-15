import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { LiveMode } from "@/lib/types/liveState";

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
