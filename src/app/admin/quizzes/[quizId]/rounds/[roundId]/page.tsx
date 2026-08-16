"use client";

import { use } from "react";

import { CodeGateLoading, NotFoundPanel } from "@/components/CodeGateStatus";
import { RequireAuth } from "@/components/RequireAuth";
import { BankSection } from "@/components/rounds/BankSection";
import { ImportExportSection } from "@/components/rounds/ImportExportSection";
import { ListRoundEditor } from "@/components/rounds/ListRoundEditor";
import { QuestionEditor } from "@/components/rounds/QuestionEditor";
import { RoundFlavourReference } from "@/components/rounds/RoundFlavourReference";
import { RoundPresentationSection } from "@/components/rounds/RoundPresentationSection";
import { AppShell, BackLink, SectionHeading } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldStyles } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog";
import { useQuestions } from "@/lib/hooks/useQuestions";
import { useQuiz } from "@/lib/hooks/useQuiz";
import { useRounds } from "@/lib/hooks/useRounds";
import { addQuestion } from "@/lib/questions";
import { updateRound } from "@/lib/rounds";
import { realRoundsOf } from "@/lib/types/round";

function RoundEditor({ quizId, roundId }: { quizId: string; roundId: string }) {
  const quiz = useQuiz(quizId);
  const rounds = useRounds(quizId);
  const questions = useQuestions(quizId, roundId);
  const { confirmDialog, dialog } = useConfirmDialog();

  const round = rounds?.find((r) => r.id === roundId);
  const isLongGame = round?.isLongGame ?? false;
  const realRoundCount = realRoundsOf(rounds).length;

  if (quiz === undefined || rounds === undefined || questions === undefined) {
    return <CodeGateLoading />;
  }

  if (quiz === null || !round) {
    return (
      <NotFoundPanel title="Round not found" message="This round doesn't exist, or was deleted." />
    );
  }

  if (round.roundType === "list") {
    return (
      <ListRoundEditor
        quizId={quizId}
        roundId={roundId}
        title={round.title}
        listPrompt={round.listPrompt}
        listAnswerReference={round.listAnswerReference}
      />
    );
  }

  // The Long Game must always have at most one clue per real round - see
  // TooFewRoundsForLongGameError in lib/rounds.ts for the other half of
  // this invariant (blocking round deletion instead of guessing which
  // clue to drop).
  const atClueCap = isLongGame && questions.length >= realRoundCount;

  return (
    <AppShell width="wide">
      <BackLink href={`/admin/quizzes/${quizId}`}>Back to quiz</BackLink>

      {isLongGame ? (
        <>
          <div className="mb-2">
            <Badge tone="gold">The Long Game</Badge>
          </div>
          <h1 className="font-display mb-3 text-3xl font-semibold text-ink">The Long Game</h1>
          <p className="mb-8 text-sm text-ink-muted">
            One clue per round, in order from vaguest to easiest - clue {"{"}
            n{"}"} is shown at the end of round {"{"}n{"}"}. Exactly one clue slot per real round
            is enforced automatically.
          </p>
        </>
      ) : (
        <input
          defaultValue={round.title}
          onBlur={(event) => updateRound(quizId, roundId, { title: event.target.value })}
          className={cn(fieldStyles, "font-display mb-8 text-2xl font-semibold")}
        />
      )}

      <div className={cn("grid gap-6", !isLongGame && "lg:grid-cols-[minmax(0,1fr)_300px]")}>
        <div className="min-w-0">
          {!isLongGame && (
            <>
              <RoundPresentationSection
                quizId={quizId}
                roundId={roundId}
                round={round}
                questions={questions}
              />
              <BankSection
                quizId={quizId}
                quizTitle={quiz.title}
                roundId={roundId}
                questions={questions}
                flavour={round.flavour}
              />
              <ImportExportSection
                quizId={quizId}
                roundId={roundId}
                roundTitle={round.title}
                questions={questions}
                flavour={round.flavour}
              />
            </>
          )}

          <SectionHeading
            actions={
              <Button
                variant="primary"
                disabled={atClueCap}
                onClick={() => addQuestion(quizId, roundId, questions)}
              >
                {isLongGame ? "Add Clue" : "Add Question"}
              </Button>
            }
          >
            {isLongGame ? "Clues" : "Questions"}
          </SectionHeading>

          {atClueCap && (
            <p className="mb-4 text-xs text-ink-muted">
              There{"'"}s already one clue per round ({realRoundCount}). Add another round first
              if you need more.
            </p>
          )}

          {questions.length === 0 ? (
            <EmptyState>
              {isLongGame
                ? "No clues yet — add your first one, starting with the vaguest."
                : "No questions yet — add your first one, or paste a batch in via Import above."}
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {questions.map((question, index) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  index={index}
                  questions={questions}
                  quizId={quizId}
                  roundId={roundId}
                  isLongGame={isLongGame}
                  flavour={round.flavour}
                  confirmDialog={confirmDialog}
                />
              ))}
            </ul>
          )}
        </div>

        {!isLongGame && (
          <aside className="min-w-0">
            <RoundFlavourReference selected={round.flavour} />
          </aside>
        )}
      </div>

      {dialog}
    </AppShell>
  );
}

export default function RoundPage({
  params,
}: {
  params: Promise<{ quizId: string; roundId: string }>;
}) {
  const { quizId, roundId } = use(params);
  return (
    <RequireAuth>
      <RoundEditor quizId={quizId} roundId={roundId} />
    </RequireAuth>
  );
}
