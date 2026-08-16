"use client";

import { cn } from "@/lib/cn";

/**
 * The projector's period-TV-set look: a pool of light at the top falling
 * to the backdrop, with a curved-screen border. Used for anything meant
 * to feel like it's the thing being watched - Display and Leaderboard
 * full-screen, and the Controller's own previews of what's on screen.
 *
 * `as="form"` covers the one non-div use (the login card); the rest of
 * the props just pass through, so a form still gets its onSubmit.
 */
export function ScreenFrame({
  children,
  className,
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "form";
} & React.HTMLAttributes<HTMLDivElement | HTMLFormElement>) {
  return (
    <Tag className={cn("tv-screen rounded-screen border-2 border-flame/30", className)} {...rest}>
      {children}
    </Tag>
  );
}
