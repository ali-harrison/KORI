"use client";

import { useEffect } from "react";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Fixed 420px right panel — used for Record payment only (the one place
// the design system specifies it). Everything else keeps the existing
// centered Modal.
export function SlideOver({ open, onClose, title, description, children, footer }: SlideOverProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-[rgba(5,7,6,0.62)] animate-[so-fade_150ms_ease]" />
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slideover-title"
        className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-[#101311] border-l border-[#212623] flex flex-col animate-[so-slide_200ms_ease] p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 id="slideover-title" className="text-[15px] font-medium text-[#e7eae8]">
              {title}
            </h2>
            {description && <p className="text-xs text-[#8f978f] mt-[3px]">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-[#646c66] hover:text-[#e7eae8] text-base leading-none transition-colors duration-150"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto mt-6">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 pt-4">{footer}</div>}
      </div>
    </div>
  );
}
