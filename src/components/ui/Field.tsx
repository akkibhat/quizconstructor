import { cn } from "@/lib/cn";

/**
 * Shared styling for every text input, textarea and select in the app.
 * Exported as a class string rather than wrapper components because
 * most fields here are uncontrolled (`defaultValue` + `onBlur` saves
 * straight to Firestore), and wrapping them would only get in the way
 * of that pattern.
 */
export const fieldStyles = cn(
  "w-full rounded-chip border border-edge bg-backdrop px-3 py-2 text-ink",
  "placeholder:text-ink-muted/70",
  "focus:border-flame focus:outline-none"
);

/** The same, sized down for inline fields sitting inside a row. */
export const fieldStylesCompact = cn(
  "rounded-chip border border-edge bg-backdrop px-2 py-1.5 text-sm text-ink",
  "placeholder:text-ink-muted/70",
  "focus:border-flame focus:outline-none"
);

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-sm text-ink-muted", className)}>
      {children}
    </label>
  );
}
