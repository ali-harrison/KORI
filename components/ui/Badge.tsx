import { cn } from "@/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[rgba(125,133,127,0.10)] text-[#8f978f] border-[rgba(125,133,127,0.20)]",
  success: "bg-[rgba(63,179,137,0.10)] text-[#5fc9a4] border-[rgba(63,179,137,0.24)]",
  warning: "bg-[rgba(203,165,94,0.10)] text-[#cba55e] border-[rgba(203,165,94,0.24)]",
  danger:  "bg-[rgba(207,114,99,0.12)] text-[#cf7263] border-[rgba(207,114,99,0.27)]",
  accent:  "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] border-[color-mix(in_srgb,var(--accent)_25%,transparent)]",
  muted:   "bg-[rgba(125,133,127,0.06)] text-[#59615b] border-[rgba(125,133,127,0.14)]",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-[#8f978f]",
  success: "bg-[#5fc9a4]",
  warning: "bg-[#cba55e]",
  danger:  "bg-[#cf7263]",
  accent:  "bg-[var(--accent)]",
  muted:   "bg-[#59615b]",
};

export function Badge({
  children,
  variant = "default",
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        "px-2.5 py-[3px] text-xs font-normal",
        "rounded-full border",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "inline-block w-1.5 h-1.5 rounded-full flex-shrink-0",
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  );
}
