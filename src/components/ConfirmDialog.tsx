"use client";

import { Button } from "@/components/ui/Button";

/**
 * The bit of state that decides whether a dialog is showing and what it
 * says. "confirm" gets a Cancel + destructive-styled action button;
 * "alert" gets a single OK button, for error messages that don't need a
 * yes/no choice (e.g. "There's already a Gauntlet round in this quiz").
 * Owned by useConfirmDialog - see that hook for how this gets set.
 */
export type ConfirmDialogState = {
  kind: "confirm" | "alert";
  title?: string;
  message: string;
  confirmLabel?: string;
} | null;

/**
 * A styled modal replacing the browser's native confirm()/alert(), which
 * looked jarring next to the rest of the app's styling. Purely
 * presentational - pass it the state to show and what to do when the
 * user picks a button; see useConfirmDialog for the paired hook that
 * manages that state and turns button clicks back into a resolved
 * Promise, mirroring how confirm()/alert() used to work.
 */
export function ConfirmDialog({
  state,
  onConfirm,
  onCancel,
}: {
  state: ConfirmDialogState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!state) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-panel border border-edge-strong bg-surface p-6 shadow-2xl">
        {state.title && (
          <h2 className="font-display mb-2 text-lg font-semibold text-ink">{state.title}</h2>
        )}
        <p className="text-sm text-ink-soft">{state.message}</p>
        <div className="mt-6 flex justify-end gap-2.5">
          {state.kind === "confirm" && (
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            variant={state.kind === "confirm" ? "danger" : "primary"}
            onClick={onConfirm}
            autoFocus
          >
            {state.confirmLabel ?? (state.kind === "confirm" ? "Delete" : "OK")}
          </Button>
        </div>
      </div>
    </div>
  );
}
