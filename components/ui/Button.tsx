"use client";

import { cn } from "@/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-[#e8ff47] text-[#0c0c0c] font-semibold",
    "hover:bg-[#f0ff6b] hover:shadow-[0_0_16px_rgba(232,255,71,0.2)]",
    "disabled:bg-[rgba(232,255,71,0.3)] disabled:text-[rgba(12,12,12,0.4)] disabled:shadow-none",
  ].join(" "),
  secondary: [
    "bg-[#161616] text-[#f5f5f5] font-medium",
    "border border-[rgba(255,255,255,0.08)]",
    "hover:bg-[#1c1c1c] hover:border-[rgba(255,255,255,0.14)]",
    "disabled:opacity-40",
  ].join(" "),
  ghost: [
    "bg-transparent text-[#888888] font-medium",
    "hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f5f5f5]",
    "disabled:opacity-40",
  ].join(" "),
  danger: [
    "bg-[rgba(239,68,68,0.1)] text-[#ef4444] font-medium",
    "border border-[rgba(239,68,68,0.2)]",
    "hover:bg-[rgba(239,68,68,0.18)] hover:border-[rgba(239,68,68,0.35)]",
    "disabled:opacity-40",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-7 px-3 text-xs rounded-[6px] gap-1.5",
  md: "h-9 px-4 text-sm rounded-[6px] gap-2",
  lg: "h-11 px-5 text-sm rounded-[8px] gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap",
        "transition-all duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(232,255,71,0.5)]",
        "cursor-pointer select-none",
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && "cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
      ) : icon ? (
        <span className="opacity-70 flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="opacity-70 flex-shrink-0">{iconRight}</span>
      )}
    </button>
  );
}
