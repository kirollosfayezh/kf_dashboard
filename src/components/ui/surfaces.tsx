import * as React from "react";
import { cn } from "@/lib/utils";

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
