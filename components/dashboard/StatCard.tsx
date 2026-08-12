import { cn } from "@/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

const subtextColor: Record<string, string> = {
  default: "text-[#59615b]",
  success: "text-[#5fc9a4]",
  warning: "text-[#cba55e]",
  danger: "text-[#cf7263]",
};

export function StatCard({ label, value, subtext, variant = "default" }: StatCardProps) {
  return (
    <div className="bg-[#111412] border border-[#1f2420] rounded-[10px] px-[18px] py-4">
      <div className="text-xs text-[#8f978f]">{label}</div>
      <div className="text-[26px] font-medium mt-2 tabular-nums tracking-tight leading-none">{value}</div>
      {subtext && <div className={cn("text-xs mt-[6px]", subtextColor[variant])}>{subtext}</div>}
    </div>
  );
}
