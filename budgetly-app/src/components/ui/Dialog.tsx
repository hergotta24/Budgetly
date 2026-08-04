"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Widens the panel for review tables. */
  size?: "sm" | "md" | "lg";
};

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
} as const;

/**
 * Modal built on the native `<dialog>` element, which gives us focus trapping,
 * inertness of the page behind, and Escape-to-close without extra code.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "sm",
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (open && !element.open) {
      if (typeof element.showModal === "function") element.showModal();
      else element.setAttribute("open", "");
    } else if (!open && element.open) {
      if (typeof element.close === "function") element.close();
      else element.removeAttribute("open");
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) dismisses.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-0",
        "text-ink shadow-overlay backdrop:bg-black/40",
        SIZES[size],
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line-subtle px-5 py-4">
        <div className="min-w-0">
          <h2 id="dialog-title" className="text-base font-semibold">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-ink-muted">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="-mr-1 rounded-lg p-1.5 text-ink-subtle hover:bg-surface-muted hover:text-ink"
        >
          <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {children ? (
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      ) : null}

      {footer ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-line-subtle px-5 py-3">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}

/** Confirmation dialog for destructive or irreversible actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  busy = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium disabled:opacity-60",
              destructive
                ? "bg-danger text-white hover:opacity-90"
                : "bg-brand text-brand-ink hover:bg-brand-hover",
            )}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
