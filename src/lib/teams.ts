import { collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase/client";

/**
 * Adds a team with its double-points round picks already decided. Unlike
 * rounds/questions, a team can't be created "empty" and filled in later -
 * the security rules require doubleRoundPicks to already have exactly the
 * quiz's configured count (or be empty, if double points is disabled) on
 * every write, including creation. So the add-team form collects the name
 * and picks together in one step, matching "teams pick their rounds at
 * signup" from the plan.
 */
export async function addTeam(
  quizId: string,
  name: string,
  doubleRoundPicks: string[]
): Promise<void> {
  const teamRef = doc(collection(db, "quizzes", quizId, "teams"));
  await setDoc(teamRef, {
    name,
    doubleRoundPicks,
    createdAt: serverTimestamp(),
  });
}

export async function deleteTeam(quizId: string, teamId: string): Promise<void> {
  await deleteDoc(doc(db, "quizzes", quizId, "teams", teamId));
}

/**
 * Updates a team's double-points picks. Only succeeds while the quiz is
 * still in "setup" - the security rules reject this once the quiz goes
 * live, which is what "locked before the quiz starts" means mechanically.
 */
export async function updateTeamPicks(
  quizId: string,
  teamId: string,
  doubleRoundPicks: string[]
): Promise<void> {
  await updateDoc(doc(db, "quizzes", quizId, "teams", teamId), { doubleRoundPicks });
}
