"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/utils";
import { Button } from "./Button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  // A panel down the right edge, for forms done alongside what's behind them.
  side?: boolean;
}

// Native <dialog>: showModal() traps focus, makes the page behind it inert,
// closes on Escape and hands focus back on close, all without any code here.
export function Dialog({ open, onClose, title, description, children, footer, side = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the first control, which is the close button.
      dialog.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself can only be on the backdrop:
        // the inner wrapper covers the whole box.
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        side
          ? "ml-auto mr-0 my-0 h-dvh max-h-none w-full max-w-[440px] border-y-0 border-r-0 open:animate-[slide-in_260ms_var(--ease)]"
          : "m-auto w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] open:animate-[rise_220ms_var(--ease)]"
      )}
    >
      {open && (
        <div className="flex flex-col min-h-full">
          <div className="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-line">
            <div className="flex-1 min-w-0">
              <h2 id={titleId} className="text-lg leading-tight tracking-[-0.02em]">{title}</h2>
              {description && <p id={descriptionId} className="text-fg-2 text-[13px] mt-1.5 text-pretty">{description}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex-shrink-0 -mr-1 -mt-1 size-8 flex items-center justify-center text-fg-3 hover:text-fg cursor-pointer"
            >
              <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.25" />
              </svg>
            </button>
          </div>
          {children && <div className="flex-1 px-5 py-5">{children}</div>}
          {footer && <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-line mt-auto">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: "danger" | "primary";
  error?: string | null;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", loading = false, variant = "danger", error }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      {error ? <p role="alert" className="text-accent text-[13px]">{error}</p> : null}
    </Dialog>
  );
}
