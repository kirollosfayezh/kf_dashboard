import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "./feedback";

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
