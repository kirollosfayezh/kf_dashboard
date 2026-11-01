import * as React from "react";
import { cn, initials } from "@/lib/utils";
import { Card } from "./surfaces";
import type { Tone } from "./tone";

const TONE_PILL: Record<Tone, string> = {
  neutral: "bg-hover text-muted",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
};

/**
 * A state chip.
 *
 * Takes an explicit `tone`. The previous version looked the colour up from the
 * *English text* of the state ("won", "replied"), so anything unlisted silently
 * fell back to grey and the component could never be localised.
 */
export function Pill({
  tone = "neutral",
  children,
  className,
}: React.PropsWithChildren<{ tone?: Tone; className?: string }>) {
  return (
    <span
      className={cn(
        "label inline-block whitespace-nowrap rounded-full px-2.5 py-1",
        TONE_PILL[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The KPI tile used by Overview and Analytics. */
export function StatTile({
  label,
  value,
  caption,
  tone = "neutral",
  delay = 0,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: "neutral" | "success" | "danger";
  delay?: number;
}) {
  return (
    <Card style={{ animation: "kfIn .5s cubic-bezier(.22,1,.36,1) both", animationDelay: `${delay}s` }}>
      <div className="text-caption text-muted">{label}</div>
      {/* Proportional figures — tabular-nums makes a display-size number look loose. */}
      <div className="font-display mt-2 text-display">{value}</div>
      {caption ? (
        <div
          className={cn(
            "font-mono mt-1.5 text-caption",
            tone === "success" && "text-success",
            tone === "danger" && "text-danger",
            tone === "neutral" && "text-faint",
          )}
        >
          {caption}
        </div>
      ) : null}
    </Card>
  );
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  // `initials` already maps an empty name to "?"; the fallback also covers a
  // name made only of spaces.
  const letters = initials(name) || "?";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-brand grid shrink-0 place-items-center rounded-full font-semibold text-white",
        size === "sm" && "size-[29px] text-caption",
        size === "md" && "size-[34px] text-ui",
        size === "lg" && "size-[42px] text-body",
        className,
      )}
    >
      {letters}
    </div>
  );
}
