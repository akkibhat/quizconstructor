"use client";

import { where } from "firebase/firestore";
import { useEffect, useState } from "react";

import { useCollectionList } from "@/lib/hooks/useFirestore";
import { subscribeToTeamAuthUid } from "@/lib/teamAuth";
import type { Team } from "@/lib/types/team";

/**
 * Resolves which team (if any) this device's anonymous-auth session owns
 * for a given quiz - what /answer/[code] uses to know whether to show the
 * join form or the live answering screen. "One phone per team" means this
 * is always at most one team: ownerUid is unique per device, and a device
 * only ever registers once per quiz (see registerTeamSelfService).
 *
 * undefined = still resolving (auth state or the query itself),
 * null = this device doesn't own a team here yet.
 */
export function useMyTeam(quizId: string | undefined): Team | null | undefined {
  const [authUid, setAuthUid] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    return subscribeToTeamAuthUid(setAuthUid);
  }, []);

  const teams = useCollectionList<Team>(
    quizId && authUid ? ["quizzes", quizId, "teams"] : null,
    {
      constraints: authUid ? [where("ownerUid", "==", authUid)] : [],
      deps: [authUid],
    }
  );

  if (authUid === undefined) return undefined;
  if (authUid === null) return null;
  if (teams === undefined) return undefined;
  return teams[0] ?? null;
}
