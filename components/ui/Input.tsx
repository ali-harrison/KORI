"use client";

import { useId } from "react";
import { cn } from "@/utils";

const control =
  "w-full bg-sunken text-fg text-sm border border-line-strong rounded-control px-3 transition-colors duration-150 focus-visible:-outline-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

interface FieldProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && <label htmlFor={id} className="label">{label}</label>}
      {children}
      {(hint || error) && (
        <p id={`${id}-note`} className={cn("text-xs", error ? "text-accent" : "text-fg-3")}>{error ?? hint}</p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  return hint || error ? `${id}-note` : undefined;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className, ...props }: InputProps) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <input id={id} aria-describedby={describedBy(id, hint, error)} aria-invalid={error ? true : undefined} className={cn(control, "h-10", className)} {...props} />
    </Field>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, className, ...props }: TextareaProps) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <textarea id={id} aria-describedby={describedBy(id, hint, error)} aria-invalid={error ? true : undefined} className={cn(control, "py-2.5 min-h-20 resize-y leading-relaxed", className)} {...props} />
    </Field>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, hint, error, options, className, ...props }: SelectProps) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <select id={id} aria-describedby={describedBy(id, hint, error)} aria-invalid={error ? true : undefined} className={cn(control, "h-10 pr-8 appearance-none cursor-pointer", className)} {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" fill="none" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-fg-3">
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      </div>
    </Field>
  );
}
