"use client";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
        {state.title && (
          <h2 className="mb-2 text-lg font-semibold text-neutral-100">{state.title}</h2>
        )}
        <p className="text-sm text-neutral-300">{state.message}</p>
        <div className="mt-6 flex justify-end gap-3">
          {state.kind === "confirm" && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={
              state.kind === "confirm"
                ? "rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                : "rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
            }
          >
            {state.confirmLabel ?? (state.kind === "confirm" ? "Delete" : "OK")}
          </button>
        </div>
      </div>
    </div>
  );
}
