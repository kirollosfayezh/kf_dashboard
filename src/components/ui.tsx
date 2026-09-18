import * as React from "react";
import { cn } from "@/lib/utils";

/** Small, hand-rolled primitives styled to match the KF brand mockup (Dashboard.dc.html) —
 * dark panels, orange→pink gradient accents, Space Grotesk headings, JetBrains Mono labels. */

export function Card({ className, children, style }: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) {
  return (
    <div
      className={cn("rounded-2xl border p-5", className)}
      style={{ borderColor: "var(--border)", background: "var(--panel)", ...style }}
    >
      {children}
    </div>
  );
}

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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-xl">
        <h2 className="font-display text-[22px] font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="mt-1.5 text-[14.5px] leading-relaxed" style={{ color: "var(--text2)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ?? null}
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
  new: ["rgba(255,0,128,.14)", "#FF6A9E"],
  contacted: ["rgba(255,106,0,.14)", "#FF9A4D"],
  won: ["rgba(34,197,94,.14)", "#4ADE80"],
  lost: ["rgba(255,255,255,.08)", "var(--text3)"],
};

export function Pill({ text }: { text: string }) {
  const [bg, fg] = PILL_COLORS[text.toLowerCase()] ?? PILL_COLORS.draft;
  return (
    <span
      className="font-mono whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px]"
      style={{ background: bg, color: fg }}
    >
      {text}
    </span>
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

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-2xl border border-dashed p-14 text-center"
      style={{ borderColor: "var(--bstrong)", background: "var(--panel)" }}
    >
      <h3 className="font-display text-[17px] font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed" style={{ color: "var(--text2)" }}>
        {body}
      </p>
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
  );
}

/** Slide-in drawer from the right, used for the inbox lead detail panel. */
export function Drawer({
  open,
  onClose,
  children,
  title,
}: React.PropsWithChildren<{ open: boolean; onClose: () => void; title: string }>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="kf-scrollbar h-full w-full max-w-md overflow-y-auto border-l p-6"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-[18px] font-semibold">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: "var(--text3)" }}>
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
