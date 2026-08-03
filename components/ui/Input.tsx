"use client";

import { cn } from "@/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, icon, iconRight, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[#888888] tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 text-[#444444] pointer-events-none flex-shrink-0">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-9 bg-[#0c0c0c] text-[#f5f5f5] text-sm",
              "border border-[rgba(255,255,255,0.08)] rounded-[6px]",
              "px-3 py-2",
              "placeholder:text-[#444444]",
              "transition-all duration-150",
              "outline-none",
              "focus:border-[rgba(255,255,255,0.2)] focus:shadow-[0_0_0_3px_rgba(232,255,71,0.06)]",
              "hover:border-[rgba(255,255,255,0.12)]",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              error && "border-[rgba(239,68,68,0.4)] focus:border-[rgba(239,68,68,0.6)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]",
              icon ? "pl-9" : "",
              iconRight ? "pr-9" : "",
              className
            )}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 text-[#444444] pointer-events-none flex-shrink-0">
              {iconRight}
            </span>
          )}
        </div>
        {(hint || error) && (
          <p className={cn("text-xs", error ? "text-[#ef4444]" : "text-[#444444]")}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// ── Textarea ──────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[#888888] tracking-wide"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full bg-[#0c0c0c] text-[#f5f5f5] text-sm",
            "border border-[rgba(255,255,255,0.08)] rounded-[6px]",
            "px-3 py-2.5 min-h-[80px] resize-y",
            "placeholder:text-[#444444]",
            "transition-all duration-150",
            "outline-none",
            "focus:border-[rgba(255,255,255,0.2)] focus:shadow-[0_0_0_3px_rgba(232,255,71,0.06)]",
            "hover:border-[rgba(255,255,255,0.12)]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-[rgba(239,68,68,0.4)] focus:border-[rgba(239,68,68,0.6)]",
            className
          )}
          {...props}
        />
        {(hint || error) && (
          <p className={cn("text-xs", error ? "text-[#ef4444]" : "text-[#444444]")}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

// ── Select ─────────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, options, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[#888888] tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-9 bg-[#0c0c0c] text-[#f5f5f5] text-sm",
              "border border-[rgba(255,255,255,0.08)] rounded-[6px]",
              "px-3 py-2 pr-8 appearance-none cursor-pointer",
              "transition-all duration-150 outline-none",
              "focus:border-[rgba(255,255,255,0.2)] focus:shadow-[0_0_0_3px_rgba(232,255,71,0.06)]",
              "hover:border-[rgba(255,255,255,0.12)]",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#444444]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        {(hint || error) && (
          <p className={cn("text-xs", error ? "text-[#ef4444]" : "text-[#444444]")}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
