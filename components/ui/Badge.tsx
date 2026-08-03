import { cn } from "@/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[rgba(255,255,255,0.06)] text-[#888888] border-[rgba(255,255,255,0.08)]",
  success: "bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]",
  warning: "bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border-[rgba(245,158,11,0.2)]",
  danger:  "bg-[rgba(239,68,68,0.1)] text-[#ef4444] border-[rgba(239,68,68,0.2)]",
  accent:  "bg-[rgba(232,255,71,0.08)] text-[#e8ff47] border-[rgba(232,255,71,0.15)]",
  muted:   "bg-[rgba(255,255,255,0.03)] text-[#444444] border-[rgba(255,255,255,0.05)]",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-[#888888]",
  success: "bg-[#10b981]",
  warning: "bg-[#f59e0b]",
  danger:  "bg-[#ef4444]",
  accent:  "bg-[#e8ff47]",
  muted:   "bg-[#444444]",
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
        "px-2 py-0.5 text-xs font-medium",
        "rounded-[4px] border",
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
