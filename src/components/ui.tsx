import * as React from "react";
import { createPortal } from "react-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

/** Small, hand-rolled primitives styled to match the KF brand mockup (Dashboard.dc.html) —
 * dark panels, orange→pink gradient accents, Space Grotesk headings, JetBrains Mono labels. */

/** `card()` in the mockup: 1px border, 16px radius, --panel, 22px padding. */
export function Card({ className, children, style }: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) {
  return (
    <div
      className={cn("rounded-2xl border p-[18px] sm:p-[22px]", className)}
      style={{ borderColor: "var(--border)", background: "var(--panel)", ...style }}
    >
      {children}
    </div>
  );
}

/** `sectionHead()` — the 22px screen title, its 14.5px lede and a right-hand action. */
export function SectionHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-[18px]">
      <div className="max-w-[620px]">
        <h2 className="font-display text-[22px] font-semibold tracking-[-.02em]">{title}</h2>
        {subtitle ? (
          <p className="mt-[7px] text-[14.5px] leading-[1.55]" style={{ color: "var(--text2)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ?? null}
    </div>
  );
}

/** `h2()` — the smaller 17px heading that titles a panel inside a screen. */
export function PanelHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-[18px]">
      <h2 className="font-display text-[17px] font-semibold tracking-[-.01em]">{title}</h2>
      {subtitle ? (
        <p className="mt-[5px] text-[13.5px]" style={{ color: "var(--text2)" }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function GradientButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-[13.5px] font-semibold text-white transition-transform hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0",
        className,
      )}
      style={{ background: "linear-gradient(135deg,#FF6A00,#FF0080)" }}
    >
      {children}
    </button>
  );
}

export function Button({
  className,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost" | "danger" }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[9px] border px-3.5 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50",
        variant === "ghost" && "border-transparent bg-transparent",
        variant === "danger" && "text-[#FF6A9E]",
        className,
      )}
      style={{
        borderColor: variant === "ghost" ? "transparent" : "var(--border)",
        background: variant === "ghost" ? "transparent" : "var(--panel2)",
        color: variant === "default" ? "var(--text)" : undefined,
      }}
    >
      {props.children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn("w-full rounded-[10px] border px-3.5 py-2.5 text-[14.5px]", props.className)}
      style={{ borderColor: "var(--border)", background: "var(--field)", color: "var(--text)" }}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full resize-y rounded-[10px] border px-3.5 py-2.5 text-[14.5px] leading-relaxed",
        props.className,
      )}
      style={{ borderColor: "var(--border)", background: "var(--field)", color: "var(--text)" }}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn("w-full rounded-[10px] border px-3.5 py-2.5 text-[14px]", props.className)}
      style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
    />
  );
}

export function Field({
  label,
  children,
  hint,
}: React.PropsWithChildren<{ label: string; hint?: string }>) {
  return (
    <label className="mb-4 block">
      <div className="mb-1.5 text-[12.5px] font-semibold" style={{ color: "var(--text2)" }}>
        {label}
      </div>
      {children}
      {hint ? (
        <div className="mt-1.5 text-[12px]" style={{ color: "var(--text3)" }}>
          {hint}
        </div>
      ) : null}
    </label>
  );
}

const PILL_COLORS: Record<string, [string, string]> = {
  published: ["rgba(34,197,94,.14)", "#4ADE80"],
  draft: ["rgba(255,255,255,.08)", "var(--text2)"],
  scheduled: ["rgba(255,106,0,.14)", "#FF9A4D"],
  new: ["rgba(255,0,128,.14)", "#FF6A9E"],
  read: ["rgba(255,255,255,.08)", "var(--text2)"],
  replied: ["rgba(34,197,94,.14)", "#4ADE80"],
  contacted: ["rgba(255,106,0,.14)", "#FF9A4D"],
  won: ["rgba(34,197,94,.14)", "#4ADE80"],
  lost: ["rgba(255,255,255,.08)", "var(--text3)"],
};

/** `pill()` — 10.5px mono, 4px/9px padding, fully rounded, tinted by state. */
export function Pill({ text }: { text: string }) {
  const [bg, fg] = PILL_COLORS[text.toLowerCase()] ?? PILL_COLORS.draft;
  return (
    <span
      className="font-mono whitespace-nowrap rounded-full px-[9px] py-[4px] text-[10.5px]"
      style={{ background: bg, color: fg }}
    >
      {/* The mockup capitalises its state words; the API's are lower-case. */}
      {text ? text[0].toUpperCase() + text.slice(1) : text}
    </span>
  );
}

/** `addBtn()` — outlined button with a leading plus, used beside every section head. */
export function AddButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cn(
        "inline-flex items-center gap-2 rounded-[10px] border px-4 py-2.5 text-[13.5px] font-semibold transition-colors",
        props.className,
      )}
      style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
    >
      <Plus size={15} />
      {children}
    </button>
  );
}

/** `rowActions()` — the pair of 30px square icon buttons at the end of a row. */
export function RowActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  const base =
    "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] border transition-colors";
  return (
    <div className="flex justify-end gap-[7px]">
      <button
        type="button"
        title="Edit"
        aria-label="Edit"
        onClick={onEdit}
        className={base}
        style={{ borderColor: "var(--border)", color: "var(--text2)", background: "transparent" }}
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        title="Delete"
        aria-label="Delete"
        onClick={onDelete}
        className={base}
        style={{ borderColor: "var(--border)", color: "#FF6A9E", background: "transparent" }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export interface DataColumn {
  label: string;
  /** Grid track width, e.g. "2fr" or "90px" — matches the mockup's `listTable` cols. */
  w: string;
  /** Hidden in the stacked mobile card (the value is usually already in the title row). */
  hideOnMobile?: boolean;
}

/**
 * `listTable()` — bordered panel, mono column heads on --panel2, hairline-separated
 * rows. From `md` the rows are a grid that scrolls sideways rather than crushing
 * columns; below `md` each row stacks into a labelled card so 375px never overflows.
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
    <div
      className="kf-tw rounded-2xl border"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      <div className="kf-tw-inner overflow-hidden rounded-2xl">
        <div
          className="font-mono hidden gap-[14px] border-b px-5 py-[13px] text-[10.5px] tracking-[.08em] md:grid"
          style={{
            gridTemplateColumns: template,
            borderColor: "var(--border)",
            background: "var(--panel2)",
            color: "var(--text3)",
          }}
        >
          {columns.map((c, i) => (
            <div key={i}>{c.label.toUpperCase()}</div>
          ))}
        </div>
        {rows.map((cells, ri) => (
          <div
            key={rowKey ? rowKey(ri) : ri}
            className="kf-row flex flex-col gap-2 px-4 py-4 text-[14px] transition-colors md:grid md:items-center md:gap-[14px] md:px-5 md:py-[15px]"
            style={{
              gridTemplateColumns: template,
              borderBottom: ri < rows.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            {cells.map((c, i) => {
              const col = columns[i];
              const labelled = col?.label && !col.hideOnMobile;
              return (
                <div key={i} className="flex min-w-0 items-center gap-2 md:block">
                  {labelled ? (
                    <span
                      className="font-mono w-[84px] shrink-0 text-[10px] tracking-[.08em] md:hidden"
                      style={{ color: "var(--text3)" }}
                    >
                      {col.label.toUpperCase()}
                    </span>
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

/** The KPI tile used by Overview and Analytics: label, value, optional caption. */
export function StatTile({
  label,
  value,
  caption,
  captionTone = "muted",
  delay = 0,
}: {
  label: string;
  value: string;
  caption?: string;
  captionTone?: "muted" | "up" | "down";
  delay?: number;
}) {
  const color =
    captionTone === "up" ? "#4ADE80" : captionTone === "down" ? "#FF6A9E" : "var(--text3)";
  return (
    <Card style={{ animation: "kfIn .5s cubic-bezier(.22,1,.36,1) both", animationDelay: `${delay}s` }}>
      <div className="text-[12.5px]" style={{ color: "var(--text2)" }}>
        {label}
      </div>
      {/* Proportional figures — tabular-nums makes a display-size number look loose. */}
      <div className="font-display mt-2 text-[29px] font-bold tracking-[-.02em]">{value}</div>
      {caption ? (
        <div className="font-mono mt-1.5 text-[12.5px]" style={{ color }}>
          {caption}
        </div>
      ) : null}
    </Card>
  );
}

export function Toggle({ on, onClick, disabled }: { on: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative h-[21px] w-[38px] shrink-0 rounded-full transition-opacity disabled:opacity-40"
      style={{
        background: on ? "linear-gradient(135deg,#FF6A00,#FF0080)" : "var(--panel2)",
        border: on ? "none" : "1px solid var(--border)",
      }}
    >
      <span
        className="absolute top-[2px] h-[17px] w-[17px] rounded-full bg-white transition-all"
        style={{ left: on ? "19px" : "2px" }}
      />
    </button>
  );
}

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg,#FF6A00,#FF0080)",
        fontSize: size * 0.34,
      }}
    >
      {initials || "?"}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-4 w-4 animate-spin rounded-full border-2 border-white/20", className)}
      style={{ borderTopColor: "#FF6A00" }}
    />
  );
}

/** The mockup's empty state: dashed panel, icon chip, 17px title, lede, optional CTA. */
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
    <div
      className="rounded-2xl border border-dashed px-6 py-10 text-center sm:py-[60px]"
      style={{ borderColor: "var(--bstrong)", background: "var(--panel)" }}
    >
      {icon ? (
        <div
          className="mx-auto grid h-[52px] w-[52px] place-items-center rounded-[14px] border"
          style={{ background: "var(--panel2)", borderColor: "var(--border)", color: "var(--text3)" }}
        >
          {icon}
        </div>
      ) : null}
      <h3 className={cn("font-display text-[17px] font-semibold", icon && "mt-4")}>{title}</h3>
      <p
        className="mx-auto mt-2 max-w-[420px] text-[14px] leading-[1.6]"
        style={{ color: "var(--text2)" }}
      >
        {body}
      </p>
      {action ? <div className="mt-[18px] flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="mb-4 rounded-[10px] border px-3.5 py-3 text-[13.5px]"
      style={{ background: "rgba(255,0,128,.12)", borderColor: "rgba(255,0,128,.3)", color: "#FF6A9E" }}
    >
      {message}
    </div>
  );
}

/** Simple confirmation modal used for destructive actions (delete). */
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
  if (!open) return null;
  return (
    <Overlay>
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl border p-6"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-[17px] font-semibold">{title}</h3>
        <p className="mt-2 text-[14px]" style={{ color: "var(--text2)" }}>
          {body}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <GradientButton onClick={onConfirm}>{confirmLabel}</GradientButton>
        </div>
      </div>
    </div>
    </Overlay>
  );
}

/**
 * Slide-in sheet from the right: full-screen on a phone, a panel on desktop.
 *
 * Stays mounted while `open` so it can animate — it used to return `null`, which
 * made it pop in and out. The pattern mirrors the sidebar
 * (`app-sidebar.tsx`): a scrim plus a `translate-x` transition.
 *
 * `footer` is rendered in a sticky bar so Save/Cancel stay reachable without
 * scrolling past a long form, and the header is sticky for the same reason.
 */
export function Drawer({
  open,
  onClose,
  children,
  title,
  subtitle,
  footer,
  width = "md",
}: React.PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  /** `lg` fits two columns of bilingual fields; `md` suits a detail panel. */
  width?: "md" | "lg";
}>) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Escape closes, and focus is kept inside while it is open — without this a
  // Tab walks off into the page behind the scrim.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
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
  }, [open, onClose]);

  // The page behind must not scroll under the sheet on touch.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus the first control so typing starts in the form, not the page behind.
  React.useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    }, 60);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <Overlay>
      <div
        className={cn(
          "fixed inset-0 z-[90] bg-black/55 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed right-0 top-0 z-[95] flex h-dvh w-full flex-col border-l transition-transform duration-200",
          width === "lg" ? "max-w-[760px]" : "max-w-md",
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4 sm:px-6"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="min-w-0">
            <h3 className="font-display text-[18px] font-semibold">{title}</h3>
            {subtitle ? (
              <p className="mt-1 text-[13px]" style={{ color: "var(--text2)" }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border text-[20px] leading-none"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          >
            &times;
          </button>
        </div>

        <div className="kf-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div
            className="shrink-0 border-t px-5 py-4 sm:px-6"
            style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </Overlay>
  );
}
