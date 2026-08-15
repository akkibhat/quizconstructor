"use client";

import { useCallback, useState } from "react";

import { ConfirmDialog, type ConfirmDialogState } from "@/components/ConfirmDialog";

/**
 * Promise-based, styled replacement for the browser's native
 * confirm()/alert(). `confirmDialog`/`alertDialog` have the same call
 * shape as the originals - just async, so call sites read almost
 * identically:
 *
 *   if (await confirmDialog(`Delete "${quiz.title}"?`)) { archiveQuiz(quiz.id); }
 *
 * Render the returned `dialog` element once, anywhere in the page (it's
 * a fixed-position overlay, so placement doesn't matter) - it's invisible
 * until a confirm/alert is actually in progress.
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>(null);
  const [resolve, setResolve] = useState<((confirmed: boolean) => void) | null>(null);

  const confirmDialog = useCallback(
    (message: string, options?: { title?: string; confirmLabel?: string }) => {
      return new Promise<boolean>((resolvePromise) => {
        setDialogState({ kind: "confirm", message, ...options });
        setResolve(() => resolvePromise);
      });
    },
    []
  );

  const alertDialog = useCallback((message: string, options?: { title?: string }) => {
    return new Promise<void>((resolvePromise) => {
      setDialogState({ kind: "alert", message, ...options });
      setResolve(() => () => resolvePromise());
    });
  }, []);

  const settle = useCallback(
    (confirmed: boolean) => {
      resolve?.(confirmed);
      setDialogState(null);
      setResolve(null);
    },
    [resolve]
  );

  const dialog = (
    <ConfirmDialog state={dialogState} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
  );

  return { confirmDialog, alertDialog, dialog };
}
