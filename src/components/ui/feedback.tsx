import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./surfaces";
import type { Tone } from "./tone";

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
