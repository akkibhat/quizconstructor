"use client";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  // The one obvious action on a screen. The hard (unblurred) shadow
  // underneath is the period detail that makes it feel like a physical
  // button - paired with a 1px nudge downward on press, below.
  primary:
    "bg-flame text-on-flame font-semibold edge-flame hover:bg-flame-bright active:translate-y-px active:shadow-none",
  secondary:
    "border border-edge-strong bg-surface text-ink-soft hover:border-flame/60 hover:text-ink",
  ghost: "text-ink-muted hover:text-ink",
  danger: "border border-danger/45 text-danger hover:bg-danger/12 hover:border-danger",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

/**
 * Returns the class string for a button-shaped control. Exported
 * separately from the component because plenty of "buttons" in this app
 * are really `next/link`s (Run Quiz, Projector, Edit and so on), and
 * those need the same styling without becoming a real <button>.
 */
export function buttonStyles(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  extra?: string
): string {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-chip transition-colors",
    "disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none",
    VARIANTS[variant],
    SIZES[size],
    extra
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button type={type} className={buttonStyles(variant, size, className)} {...props} />;
}
