import * as React from "react";
import { createPortal } from "react-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The KF dashboard primitives.
 *
 * Everything here is styled with theme utilities (`bg-panel`, `text-muted`,
 * `rounded-card`, `text-ui`) rather than inline `style` objects. That is only
 * possible because the colour tokens now live in Tailwind's `@theme` block —
 * see the header of `styles.css` for why that one change was the difference
 * between a design system and 248 hand-written style objects.
 *
 * Two rules every component here follows:
 *
 * 1. **`className` and `style` are destructured out of props, the spread comes
 *    first, and both merged attributes come last.** The previous version
 *    spread `{...props}` *before* a hardcoded `style`, so a caller's `style`
 *    was silently discarded — which is why the validation border on the
 *    Marketing screen never appeared.
 * 2. **Sizes come from the scale.** `h-control`, `text-ui`, `rounded-control`.
 *    No arbitrary pixel values; if a new one is needed, it goes in the scale.
 */

/**
 * Renders overlays into `document.body`.
 *
 * Every screen is wrapped in `.kf-scr`, which runs `animation: kfIn … both`.
 * The fill mode leaves that animation's transform applied forever, and *any*
 * transform makes an element the containing block for `position: fixed`
 * descendants — so an overlay rendered in place anchors to the screen wrapper
 * instead of the viewport, landing inset and mis-sized. Portalling out of the
 * wrapper is the fix that survives whatever a route does to its own container.
 */
function Overlay({ children }: React.PropsWithChildren) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/* ========================================================== surfaces ===== */

export function Card({
  className,
  children,
  style,
  padding = "default",
  as: Tag = "div",
}: React.PropsWithChildren<{
  className?: string;
  style?: React.CSSProperties;
  /** `compact` for dense card grids; `none` when the card holds its own layout. */
  padding?: "none" | "compact" | "default";
  as?: React.ElementType;
}>) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-line bg-panel shadow-card",
        padding === "default" && "p-5",
        padding === "compact" && "p-4",
        className,
      )}
      style={style}
    >
      {children}
    </Tag>
  );
}

/**
 * The heading block for a screen (`level={1}`) or a panel inside one
 * (`level={2}`). Replaces `SectionHead` and `PanelHead`, which were the same
 * component at two sizes and were additionally re-implemented by hand in
 * `charts.tsx` and `seo.tsx`.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  level = 1,
  className,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  level?: 1 | 2;
  className?: string;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        level === 1 ? "mb-6" : "mb-4",
        className,
      )}
    >
      <div className="max-w-[620px]">
        {eyebrow ? <div className="label mb-1.5 text-faint">{eyebrow}</div> : null}
        <Heading className={cn("font-display", level === 1 ? "text-title" : "text-section")}>
          {title}
        </Heading>
        {subtitle ? (
          <p className={cn("mt-1.5 text-muted", level === 1 ? "text-body" : "text-caption")}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ?? null}
    </div>
  );
}

/** @deprecated Use `PageHeader`. Kept so routes compile during the migration. */
export function SectionHead(props: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <PageHeader level={1} title={props.title} subtitle={props.subtitle} actions={props.action} />;
}

/** @deprecated Use `PageHeader level={2}`. */
export function PanelHead(props: { title: string; subtitle?: string }) {
  return <PageHeader level={2} title={props.title} subtitle={props.subtitle} />;
}

/* =========================================================== controls ==== */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  loading?: boolean;
}

/**
 * One button. Absorbs what used to be `GradientButton` (primary) and
 * `AddButton` (secondary with a plus), which between them produced five
 * different geometries for the same control.
 */
export function Button({
  className,
  style,
  variant = "secondary",
  size = "md",
  icon,
  loading,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-control border font-semibold transition-[transform,background-color,border-color] disabled:opacity-50",
        size === "md" ? "h-control px-4 text-ui" : "h-control-sm px-3 text-caption",
        variant === "primary" && "bg-brand border-transparent text-white hover:-translate-y-px disabled:hover:translate-y-0",
        variant === "secondary" && "border-line bg-raised text-ink hover:border-line-strong",
        variant === "ghost" && "border-transparent bg-transparent text-muted hover:text-ink",
        variant === "danger" && "border-line bg-raised text-danger hover:border-danger",
        className,
      )}
      style={style}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon}
      {children}
    </button>
  );
}

/** @deprecated Use `<Button variant="primary">`. */
export function GradientButton(props: ButtonProps) {
  return <Button variant="primary" {...props} />;
}

/** @deprecated Use `<Button icon={<Plus size={15} />}>`. */
export function AddButton(props: ButtonProps) {
  return <Button icon={<Plus size={15} />} {...props} />;
}

/** A square icon-only button. Roughly ten hand-rolled copies existed at four
 *  different sizes; `label` is required because most of them had no accessible
 *  name at all. */
export function IconButton({
  label,
  icon,
  size = "sm",
  tone = "default",
  variant = "bordered",
  className,
  style,
  type,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: React.ReactNode;
  size?: "sm" | "md";
  tone?: "default" | "danger";
  variant?: "bordered" | "ghost";
}) {
  return (
    <button
      {...props}
      type={type ?? "button"}
      title={label}
      aria-label={label}
      className={cn(
        "grid shrink-0 place-items-center rounded-xs border transition-colors disabled:opacity-50",
        size === "sm" ? "size-control-sm" : "size-control",
        variant === "bordered" ? "border-line bg-transparent hover:border-line-strong" : "border-transparent",
        tone === "danger" ? "text-danger" : "text-muted hover:text-ink",
        className,
      )}
      style={style}
    >
      {icon}
    </button>
  );
}

const fieldBase =
  "w-full rounded-control border border-line bg-field px-3.5 text-ink placeholder:text-faint transition-colors";

export function Input({
  className,
  style,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, "h-control text-body", invalid && "border-warning", className)}
      style={style}
    />
  );
}

export function Textarea({
  className,
  style,
  invalid,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, "resize-y py-2.5 text-body", invalid && "border-warning", className)}
      style={style}
    />
  );
}

export function Select({
  className,
  style,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(fieldBase, "h-control bg-panel text-body", className)}
      style={style}
    />
  );
}

/**
 * A labelled form control.
 *
 * Renders `<label htmlFor>` rather than wrapping the control, because wrapping
 * meant clicking the *hint* focused the input, and it is the wrong element for
 * a group of radios or a `Toggle` row.
 */
export function Field({
  label,
  htmlFor,
  children,
  hint,
  error,
  required,
  className,
}: React.PropsWithChildren<{
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}>) {
  return (
    <div className={cn("mb-4", className)}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-caption font-semibold text-muted">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      {children}
      {error ? (
        <div className="mt-1.5 text-caption text-danger">{error}</div>
      ) : hint ? (
        <div className="mt-1.5 text-caption text-faint">{hint}</div>
      ) : null}
    </div>
  );
}

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

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

/** Maps the API's lower-case state words onto a tone, for the screens that
 *  display raw status values. Unknown states read as neutral. */
export function toneForStatus(status: string): Tone {
  switch (status.toLowerCase()) {
    case "published":
    case "replied":
    case "won":
      return "success";
    case "scheduled":
    case "contacted":
      return "warning";
    case "new":
      return "danger";
    default:
      return "neutral";
  }
}

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

/* ============================================================ feedback === */

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        // `border-line-strong` rather than a fixed white alpha: the old track was
        // `border-white/20`, invisible on a light-mode panel.
        "size-4 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-brand-1",
        className,
      )}
      role="presentation"
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-control bg-hover", className)} />;
}

/**
 * The loading placeholder, replacing a nine-line block that was duplicated
 * byte-identically across nine screens.
 *
 * `skeleton` variants keep the page's shape while it loads, so arriving content
 * does not shift the layout.
 */
export function LoadingState({
  variant = "spinner",
  skeleton = "cards",
  rows = 3,
  label = "Loading",
  className,
}: {
  variant?: "spinner" | "skeleton";
  skeleton?: "table" | "cards" | "form" | "stats";
  rows?: number;
  label?: string;
  className?: string;
}) {
  if (variant === "spinner") {
    return (
      <div className={cn("grid place-items-center py-16", className)} role="status" aria-live="polite">
        <Spinner className="size-8" />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  const shapes: Record<string, React.ReactNode> = {
    stats: (
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-20" />
          </Card>
        ))}
      </div>
    ),
    cards: (
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        {Array.from({ length: rows }, (_, i) => (
          <Card key={i}>
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
          </Card>
        ))}
      </div>
    ),
    table: (
      <Card padding="none" className="overflow-hidden">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </Card>
    ),
    form: (
      <Card>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="mb-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-control w-full" />
          </div>
        ))}
      </Card>
    ),
  };

  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      {shapes[skeleton]}
      <span className="sr-only">{label}</span>
    </div>
  );
}

const TONE_CALLOUT: Record<Tone, string> = {
  neutral: "border-line bg-raised text-muted",
  success: "border-success/40 bg-success-bg text-success",
  warning: "border-warning/40 bg-warning-bg text-warning",
  danger: "border-danger/40 bg-danger-bg text-danger",
  info: "border-info/40 bg-info-bg text-info",
};

/**
 * An inline message. Replaces `ErrorBanner` — which was a Callout with one tone
 * and, being a plain `<div>`, meant every error in the app went unannounced —
 * and five hand-rolled note boxes.
 */
export function Callout({
  tone = "neutral",
  title,
  icon,
  action,
  children,
  className,
}: React.PropsWithChildren<{
  tone?: Tone;
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}>) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      aria-live={tone === "danger" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-2.5 rounded-control border px-3.5 py-3 text-caption",
        TONE_CALLOUT[tone],
        className,
      )}
    >
      {icon ? <span className="mt-px shrink-0">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        {title ? <div className="mb-0.5 font-semibold">{title}</div> : null}
        {children}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** @deprecated Use `<Callout tone="danger">`. */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <Callout tone="danger" className="mb-4">
      {message}
    </Callout>
  );
}

export function EmptyState({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-panel px-6 py-12 text-center">
      {icon ? (
        <div className="mx-auto grid size-[52px] place-items-center rounded-card border border-line bg-raised text-faint">
          {icon}
        </div>
      ) : null}
      <h3 className={cn("font-display text-section", icon && "mt-4")}>{title}</h3>
      <p className="mx-auto mt-2 max-w-[420px] text-body text-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
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
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
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
      {initials}
    </div>
  );
}

/* ============================================================== tables === */

export interface DataColumn {
  label: string;
  /** Grid track width, e.g. "2fr" or "90px". */
  w: string;
  /** Hidden in the stacked mobile card (the value is usually already in the title row). */
  hideOnMobile?: boolean;
}

/**
 * Bordered panel, mono column heads, hairline-separated rows. From `md` the rows
 * are a grid that scrolls sideways rather than crushing columns; below `md` each
 * row stacks into a labelled card so 375px never overflows.
 */
export function DataTable({
  columns,
  rows,
  rowKey,
}: {
  columns: DataColumn[];
  rows: React.ReactNode[][];
  rowKey?: (i: number) => string;
}) {
  const template = columns.map((c) => c.w).join(" ");
  return (
    <div className="kf-tw rounded-card border border-line bg-panel">
      <div className="kf-tw-inner overflow-hidden rounded-card">
        <div
          className="label hidden gap-[14px] border-b border-line bg-raised px-5 py-3 text-faint md:grid"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((c, i) => (
            <div key={i}>{c.label}</div>
          ))}
        </div>
        {rows.map((cells, ri) => (
          <div
            key={rowKey ? rowKey(ri) : ri}
            className={cn(
              "kf-row flex flex-col gap-2 px-4 py-4 text-body transition-colors md:grid md:min-h-row md:items-center md:gap-[14px] md:px-5",
              ri < rows.length - 1 && "border-b border-line",
            )}
            style={{ gridTemplateColumns: template }}
          >
            {cells.map((c, i) => {
              const col = columns[i];
              const labelled = col?.label && !col.hideOnMobile;
              return (
                <div key={i} className="flex min-w-0 items-center gap-2 md:block">
                  {labelled ? (
                    <span className="label w-[84px] shrink-0 text-faint md:hidden">{col.label}</span>
                  ) : null}
                  <div className="min-w-0 flex-1">{c}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RowActions({
  onEdit,
  onDelete,
  extra,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex justify-end gap-1.5">
      {extra}
      {onEdit ? <IconButton label="Edit" icon={<Pencil size={14} />} onClick={onEdit} /> : null}
      {onDelete ? (
        <IconButton label="Delete" tone="danger" icon={<Trash2 size={14} />} onClick={onDelete} />
      ) : null}
    </div>
  );
}

/* ============================================================= dialogs === */

/**
 * Escape-to-close, a Tab focus trap, a body scroll lock, initial focus and
 * focus restoration.
 *
 * Extracted from `Drawer`, which was the only component that had any of it —
 * `ConfirmDialog`, the *delete* confirmation, had none.
 */
export function useDialogBehavior({
  open,
  onClose,
  ref,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  ref: React.RefObject<HTMLElement | null>;
  dismissible?: boolean;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = ref.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, ref, dismissible]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Move focus in on open and put it back where it came from on close —
  // without the restore, confirming a delete dropped focus onto <body>.
  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => {
      ref.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    }, 60);
    return () => {
      window.clearTimeout(id);
      previouslyFocused?.focus?.();
    };
  }, [open, ref]);
}

/** A centred modal. Used for confirmations and anything short. */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "sm",
  dismissible = true,
  footer,
  children,
}: React.PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  /** `false` blocks the scrim and Escape — for an unsaved-changes guard. */
  dismissible?: boolean;
  footer?: React.ReactNode;
}>) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  useDialogBehavior({ open, onClose, ref: panelRef, dismissible });

  if (!open) return null;
  return (
    <Overlay>
      <div
        className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4"
        onClick={dismissible ? onClose : undefined}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          className={cn(
            "w-full rounded-card border border-line bg-panel p-6 shadow-overlay",
            size === "sm" && "max-w-sm",
            size === "md" && "max-w-lg",
            size === "lg" && "max-w-2xl",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id={titleId} className="font-display text-section">
            {title}
          </h2>
          {description ? (
            <p id={descId} className="mt-2 text-body text-muted">
              {description}
            </p>
          ) : null}
          {children}
          {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
        </div>
      </div>
    </Overlay>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={body}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

/**
 * Slide-in sheet from the right: full-screen on a phone, a panel on desktop.
 * Stays mounted while `open` so it can animate.
 */
export function Drawer({
  open,
  onClose,
  children,
  title,
  subtitle,
  footer,
  width = "md",
  dismissible = true,
}: React.PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  /** `lg` fits two columns of bilingual fields; `md` suits a detail panel. */
  width?: "md" | "lg";
  /** `false` while the form is dirty, so a stray scrim click cannot discard it. */
  dismissible?: boolean;
}>) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  useDialogBehavior({ open, onClose, ref: panelRef, dismissible });

  return (
    <Overlay>
      <div
        className={cn(
          "fixed inset-0 z-[90] bg-black/55 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed right-0 top-0 z-[95] flex h-dvh w-full flex-col border-l border-line bg-panel shadow-overlay transition-transform duration-200",
          width === "lg" ? "max-w-[760px]" : "max-w-md",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="font-display text-section">{title}</h2>
            {subtitle ? <p className="mt-1 text-caption text-muted">{subtitle}</p> : null}
          </div>
          <IconButton
            label="Close"
            size="md"
            onClick={onClose}
            icon={<span className="text-[20px] leading-none">&times;</span>}
          />
        </div>

        <div className="kf-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-line bg-panel px-5 py-4 sm:px-6">{footer}</div>
        ) : null}
      </div>
    </Overlay>
  );
}

/* ================================================================ forms == */

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

/* ================================================================ brand == */

/** The gradient logo chip, previously inlined in three places. */
export function BrandMark({ size = 33, className }: { size?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-brand grid shrink-0 place-items-center rounded-control", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m8 6-6 6 6 6" />
        <path d="m16 6 6 6-6 6" />
      </svg>
    </div>
  );
}
