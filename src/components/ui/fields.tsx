import * as React from "react";
import { cn } from "@/lib/utils";

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
