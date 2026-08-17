import { serverTimestamp, type DocumentData, type Timestamp } from "firebase/firestore";

// Firestore document at
// quizzes/{quizId}/teams/{teamId}/answers/{questionId} - a team's own
// phone-submitted answer to one question, only written when
// Quiz.allowsPhoneAnswering is on. Only the team's owning device
// (Team.ownerUid) can write here - see firestore.rules.
export interface TeamAnswer {
  questionId: string;
  text: string;

  // Which slide was live when this was written - the security rules only
  // accept a write where this matches liveState/current.slideIndex, which
  // is what stops a team answering ahead of time or editing after the
  // question has moved on. Not used for anything else once accepted.
  submittedAtSlideIndex: number;

  submittedAt: Timestamp;
}

export function normaliseTeamAnswer(id: string, data: DocumentData): TeamAnswer {
  return { ...(data as TeamAnswer), questionId: id };
}

export function newTeamAnswerFields(fields: {
  questionId: string;
  text: string;
  submittedAtSlideIndex: number;
}) {
  return {
    questionId: fields.questionId,
    text: fields.text,
    submittedAtSlideIndex: fields.submittedAtSlideIndex,
    submittedAt: serverTimestamp(),
  };
}
