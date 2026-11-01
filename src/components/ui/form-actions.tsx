import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./buttons";

/**
 * The save row. Four incompatible versions of this existed — one with a "Saved."
 * that never cleared, two with different timeouts, and one with no confirmation
 * at all.
 *
 * The persistent dirty hint stays inline *and* a toast fires on success: they
 * are two different affordances that happened to share a screen position.
 */
export function FormActions({
  onSave,
  onDiscard,
  saving,
  dirty,
  saveLabel = "Save changes",
  sticky,
  hint,
}: {
  onSave: () => void;
  onDiscard?: () => void;
  saving?: boolean;
  dirty?: boolean;
  saveLabel?: string;
  sticky?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        sticky &&
          "sticky bottom-0 z-10 mt-4 rounded-card border bg-panel px-4 py-3 " +
            (dirty ? "border-brand-edge" : "border-line"),
      )}
    >
      <Button variant="primary" onClick={onSave} loading={saving} disabled={dirty === false}>
        {saveLabel}
      </Button>
      {dirty && onDiscard ? (
        <Button variant="ghost" onClick={onDiscard}>
          Discard
        </Button>
      ) : null}
      {hint ?? (
        <span className={cn("text-caption", dirty ? "text-warning" : "text-faint")}>
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
      )}
    </div>
  );
}
