"use client";

import { useEffect, useState } from "react";

import { resolveMediaUrl } from "@/lib/media";

/**
 * Resolves a Storage path (as stored on a question/clue) to an actual
 * fetchable download URL. null while there's no path, or while a newly
 * changed path hasn't resolved yet.
 *
 * Tracks which path a resolved URL belongs to and only returns it while
 * that still matches the current `path` argument - this is what stops a
 * stale image from a previous slide flashing up while the next slide's
 * image is still resolving, without needing an explicit reset call.
 */
export function useMediaUrl(path: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<{ path: string | null | undefined; url: string | null }>({
    path: undefined,
    url: null,
  });

  useEffect(() => {
    if (!path) {
      return;
    }

    let cancelled = false;
    resolveMediaUrl(path).then((url) => {
      if (!cancelled) {
        setResolved({ path, url });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return resolved.path === path ? resolved.url : null;
}
