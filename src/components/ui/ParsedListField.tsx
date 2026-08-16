"use client";

import { useMemo, useState } from "react";

import { fieldStyles, Label } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { parseAnswerList } from "@/lib/questionsImportExport";

/**
 * A textarea of one-value-per-line text with a live parsed count next to
 * its label - the Gauntlet's reference list and a round's answer pool
 * both work this way. The count is derived from the same text the
 * textarea holds rather than tracked as a second state, so the two can't
 * drift apart.
 *
 * Only saves the parsed, cleaned list on blur (via `onSave`) - typing
 * doesn't write to Firestore on every keystroke.
 */
export function ParsedListField({
  id,
  label,
  unitLabel,
  unitClassName = "text-flame",
  defaultValue,
  placeholder,
  rows,
  onSave,
  renderHint,
}: {
  id: string;
  label: string;
  unitLabel: string;
  unitClassName?: string;
  defaultValue: string[] | null;
  placeholder: string;
  rows: number;
  onSave: (parsed: string[]) => void;
  // For callers that want to react to the live count too - a minimum-
  // options warning, say - without duplicating the parse themselves.
  renderHint?: (count: number) => React.ReactNode;
}) {
  const [text, setText] = useState((defaultValue ?? []).join("\n"));
  const count = useMemo(() => parseAnswerList(text).length, [text]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className={cn("font-mono text-xs tabular-nums", unitClassName)}>
          {count} {unitLabel}
          {count === 1 ? "" : "s"}
        </span>
      </div>
      <textarea
        id={id}
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const parsed = parseAnswerList(text);
          setText(parsed.join("\n"));
          onSave(parsed);
        }}
        className={cn(fieldStyles, "font-mono text-sm")}
        rows={rows}
      />
      {renderHint?.(count)}
    </div>
  );
}
