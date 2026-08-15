import { cn } from "@/lib/cn";

/**
 * The standard raised card - a round's row, a quiz on the dashboard, a
 * form group. One place to change how every container in the app looks.
 */
export function Panel({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "section" | "form";
}) {
  return (
    <Tag className={cn("rounded-panel border border-edge bg-surface p-4", className)}>
      {children}
    </Tag>
  );
}

/**
 * A dashed placeholder for "there's nothing here yet". Deliberately
 * lighter than a Panel - it should read as an absence with a nudge, not
 * as another piece of content competing for attention.
 */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-panel border border-dashed border-edge px-4 py-10 text-center text-sm text-ink-muted">
      {children}
    </p>
  );
}
