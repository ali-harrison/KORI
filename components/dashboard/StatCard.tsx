import { cn } from "@/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

const variantAccent: Record<string, string> = {
  default: "text-[#888888]",
  success: "text-[#10b981]",
  warning: "text-[#f59e0b]",
  danger:  "text-[#ef4444]",
};

const variantIconBg: Record<string, string> = {
  default: "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)]",
  success: "bg-[rgba(16,185,129,0.06)] border-[rgba(16,185,129,0.12)]",
  warning: "bg-[rgba(245,158,11,0.06)] border-[rgba(245,158,11,0.12)]",
  danger:  "bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.12)]",
};

export function StatCard({
  label,
  value,
  subtext,
  trend,
  icon,
  variant = "default",
}: StatCardProps) {
  const isPositiveTrend = trend && trend.value >= 0;

  return (
    <div className="relative rounded-[8px] bg-[#111111] border border-[rgba(255,255,255,0.06)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-5">
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-medium text-[#888888] tracking-wide">
          {label}
        </span>
        {icon && (
          <span
            className={cn(
              "w-7 h-7 rounded-[6px] border flex items-center justify-center flex-shrink-0",
              variantIconBg[variant]
            )}
          >
            <span className={cn("w-3.5 h-3.5", variantAccent[variant])}>
              {icon}
            </span>
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex flex-col gap-1">
        <span className="text-2xl font-semibold text-[#f5f5f5] leading-none tracking-tight">
          {value}
        </span>
        <div className="flex items-center gap-2 min-h-[16px]">
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                isPositiveTrend ? "text-[#10b981]" : "text-[#ef4444]"
              )}
            >
              {isPositiveTrend ? "+" : ""}
              {trend.value}%
            </span>
          )}
          {subtext && (
            <span className="text-xs text-[#888888]">{subtext}</span>
          )}
          {trend?.label && (
            <span className="text-xs text-[#444444]">{trend.label}</span>
          )}
        </div>
      </div>

      {/* Subtle bottom accent line */}
      <div
        className={cn(
          "absolute bottom-0 left-5 right-5 h-px opacity-40",
          variant === "default" && "bg-transparent",
          variant === "success" && "bg-[#10b981]",
          variant === "warning" && "bg-[#f59e0b]",
          variant === "danger" && "bg-[#ef4444]"
        )}
      />
    </div>
  );
}
