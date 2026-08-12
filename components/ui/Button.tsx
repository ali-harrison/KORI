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
    "bg-[var(--accent)] text-[#0b0d0c] font-medium",
    "hover:opacity-90",
    "disabled:opacity-40",
  ].join(" "),
  secondary: [
    "bg-[#151a16] text-[#e7eae8] font-normal",
    "border border-[#262b27]",
    "hover:border-[#3a403b]",
    "disabled:opacity-40",
  ].join(" "),
  ghost: [
    "bg-transparent text-[#b9c0ba] font-normal",
    "border border-[#262b27]",
    "hover:border-[#3a403b]",
    "disabled:opacity-40",
  ].join(" "),
  danger: [
    "bg-[rgba(207,114,99,0.10)] text-[#cf7263] font-normal",
    "border border-[rgba(207,114,99,0.24)]",
    "hover:bg-[rgba(207,114,99,0.16)] hover:border-[rgba(207,114,99,0.4)]",
    "disabled:opacity-40",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-7 px-3 text-xs rounded-[7px] gap-1.5",
  md: "h-9 px-3.5 text-[13px] rounded-[8px] gap-2",
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
        "transition-colors duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_50%,transparent)]",
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
