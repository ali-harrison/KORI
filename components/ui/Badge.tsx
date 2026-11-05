import { cn } from "@/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const text: Record<BadgeVariant, string> = {
  default: "text-fg-2",
  success: "text-ok",
  warning: "text-warn",
  danger: "text-accent",
  muted: "text-fg-3",
};

const square: Record<BadgeVariant, string> = {
  default: "bg-fg-2",
  success: "bg-ok",
  warning: "bg-warn",
  danger: "bg-accent",
  muted: "border border-fg-3",
};

// A square marker and a mono label, never colour alone.
export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.04em]", text[variant], className)}>
      <span aria-hidden className={cn("size-1.5 flex-shrink-0", square[variant])} />
      {children}
    </span>
  );
}
