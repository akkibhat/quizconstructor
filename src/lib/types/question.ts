import { serverTimestamp, type DocumentData, type Timestamp } from "firebase/firestore";

// How a question's attached audio behaves once its slide becomes current.
// "autoplay" is for generic background-clue music that should just start
// playing; "manual" is for "name that tune" / "guess the lyrics" style
// questions where the host wants to press Play themselves, for control and
// suspense. null means no audio is attached at all.
export type AudioPlayMode = "autoplay" | "manual" | null;

// Firestore document at
// quizzes/{quizId}/rounds/{roundId}/questions/{questionId}.
//
// Doubles as a Long Game clue when its round has isLongGame set: `text`
// and `imagePath` hold the clue, and `answer`/`audioPath`/`audioPlayMode`
// go unused. Reusing the type means all the existing CRUD, hooks and UI
// work for clues too - the editor just hides the irrelevant fields.
export interface Question {
  id: string;

  // 1-indexed position within the round. Same gapped-values reordering
  // scheme as Round.order.
  order: number;

  text: string;
  answer: string;

  // How many points this question is worth when fully correct - almost
  // always 1, but editable for the occasional multi-part question (e.g. a
  // full-name question worth 0.5 for each half) or a bonus question worth
  // more. Used by electronic scoring, where the scorer awards a
  // per-question point value (0, a partial amount, up to this max, or
  // beyond it for a deliberate bonus) that gets summed into the round's
  // total automatically - see lib/scoring.ts.
  points: number;

  // The choices shown beneath this question, if any - what turns a plain
  // question into a multiple-choice or Odd One Out one. Lettered A, B,
  // C... on the slide.
  //
  // There's no separate "which option is correct" field: `answer` above
  // already holds the correct answer's text, so the existing answer slide
  // and all of the scoring keep working untouched. null or empty renders
  // as an ordinary question.
  options: string[] | null;

  imagePath: string | null;
  audioPath: string | null;
  audioPlayMode: AudioPlayMode;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Fills in fields that questions written before those fields existed
 * won't have. Every path that reads a question document goes through
 * here, because Firestore rejects a write containing `undefined` - a
 * missing field read from an old document and saved straight back would
 * fail the whole write.
 */
export function normaliseQuestion(id: string, data: DocumentData): Question {
  const question = data as Omit<Question, "id">;
  return {
    ...question,
    id,
    points: question.points ?? 1,
    options: question.options ?? null,
  };
}

/**
 * The complete field set for a new question document. Four places create
 * questions - the editor's Add button, the TSV importer, the bank, and
 * quiz duplication - and each used to spell the whole shape out, so a new
 * field meant finding all four. Anything omitted here gets the same
 * default a blank question starts with, which also guarantees no
 * `undefined` reaches Firestore.
 */
export function newQuestionFields(fields: {
  order: number;
  text?: string;
  answer?: string;
  points?: number;
  options?: string[] | null;
  imagePath?: string | null;
  audioPath?: string | null;
  audioPlayMode?: AudioPlayMode;
}) {
  return {
    order: fields.order,
    text: fields.text ?? "",
    answer: fields.answer ?? "",
    points: fields.points ?? 1,
    options: fields.options ?? null,
    imagePath: fields.imagePath ?? null,
    audioPath: fields.audioPath ?? null,
    audioPlayMode: fields.audioPlayMode ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}
