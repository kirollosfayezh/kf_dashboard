import * as React from "react";
import { cn } from "@/lib/utils";

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
  id,
  className,
}: {
  checked: boolean;
  onChange?: () => void;
  disabled?: boolean;
  /** Required: this used to render a bare <button>, which a screen reader
   *  announced only as "button" — on the control that publishes content. */
  label: string;
  id?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative h-[21px] w-[38px] shrink-0 rounded-full border transition-opacity disabled:opacity-40",
        checked ? "bg-brand border-transparent" : "border-line bg-raised",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] size-[17px] rounded-full bg-white transition-all",
          checked ? "left-[19px]" : "left-[2px]",
        )}
      />
    </button>
  );
}

/**
 * One segmented control, replacing six hand-rolled copies that differed in
 * radius, active tint, text size and ARIA pattern — three used `aria-pressed`,
 * two used `role="tab"`, one used neither, and two had no accessible name.
 *
 * No `overflow-hidden` on the track: four of the six copies clipped their own
 * focus ring to invisibility. The ends are rounded by rounding the segments.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  semantics = "filter",
  size = "md",
  fill,
  scroll,
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: React.ReactNode; badge?: React.ReactNode; disabled?: boolean }>;
  /** `tabs` switches a view; `filter` narrows a list. Picks the ARIA pattern. */
  semantics?: "tabs" | "filter";
  size?: "sm" | "md";
  fill?: boolean;
  scroll?: boolean;
  className?: string;
  "aria-label": string;
}) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  // Arrow-key navigation, which `role="tablist"` obliges and none of the six
  // previous copies implemented.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (semantics !== "tabs") return;
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length];
    onChange(next.value);
    refs.current[options.indexOf(next)]?.focus();
  };

  return (
    <div
      role={semantics === "tabs" ? "tablist" : "group"}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex gap-1 rounded-control border border-line bg-raised p-1",
        scroll && "max-w-full overflow-x-auto",
        fill && "flex w-full",
        className,
      )}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role={semantics === "tabs" ? "tab" : undefined}
            aria-selected={semantics === "tabs" ? active : undefined}
            aria-pressed={semantics === "filter" ? active : undefined}
            tabIndex={semantics === "tabs" && !active ? -1 : undefined}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xs font-semibold transition-colors disabled:opacity-40",
              size === "md" ? "px-3.5 py-2 text-ui" : "px-2.5 py-1.5 text-caption",
              fill && "flex-1",
              active ? "bg-brand-tint text-ink" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
            {o.badge}
          </button>
        );
      })}
    </div>
  );
}
