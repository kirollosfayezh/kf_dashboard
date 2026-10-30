import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, IconButton } from "./buttons";
import { Overlay } from "./overlay";

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
