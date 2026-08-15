import { doc, serverTimestamp, writeBatch } from "firebase/firestore";

import { db } from "@/lib/firebase/client";

/**
 * Records one team's mark for one question, then recomputes and writes
 * their round total from *all* their marks in this round - so the round's
 * score of record (scores/{roundId}.entries[teamId], the same field paper
 * scoring writes via setRoundScore) always reflects the sum of individual
 * question marks, kept in sync on every change rather than requiring a
 * separate "save" step.
 *
 * Takes the team's current marks map (from the already-subscribed
 * useQuestionMarks hook) rather than reading it server-side first - this
 * app has one scorer working on one team at a time, so there's no
 * concurrent-write race to worry about, and it avoids an extra round trip.
 */
export async function setQuestionMark(
  quizId: string,
  roundId: string,
  teamId: string,
  questionId: string,
  pointsAwarded: number,
  currentMarks: Record<string, number>,
  isDoubled: boolean
): Promise<void> {
  // Firestore rejects `undefined` field values outright, so guard against
  // a caller accidentally passing one through (e.g. from a legacy
  // question missing its `points` field) rather than letting the whole
  // batch fail.
  const safePoints = Number.isFinite(pointsAwarded) ? pointsAwarded : 0;
  const newMarks = { ...currentMarks, [questionId]: safePoints };
  const raw = Object.values(newMarks).reduce((sum, points) => sum + points, 0);

  const batch = writeBatch(db);
  batch.set(
    doc(db, "quizzes", quizId, "scores", roundId, "questionMarks", teamId),
    { marks: newMarks, updatedAt: serverTimestamp() }
  );
  batch.set(
    doc(db, "quizzes", quizId, "scores", roundId),
    {
      entries: {
        [teamId]: { raw, isDoubled, points: isDoubled ? raw * 2 : raw },
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();
}

/** Used only if the host wants to blank a team's electronic marks and start over for this round. */
export async function clearQuestionMarks(
  quizId: string,
  roundId: string,
  teamId: string,
  isDoubled: boolean
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, "quizzes", quizId, "scores", roundId, "questionMarks", teamId), {
    marks: {},
    updatedAt: serverTimestamp(),
  });
  batch.set(
    doc(db, "quizzes", quizId, "scores", roundId),
    {
      entries: { [teamId]: { raw: 0, isDoubled, points: 0 } },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();
}
