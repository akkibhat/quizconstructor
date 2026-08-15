/**
 * Joins class names, dropping anything falsy - so a conditional class can
 * be written inline as `cond && "..."` without leaving stray "false" or
 * "undefined" in the class attribute.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
