import { cn } from "@/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[17px] tracking-[-0.02em] text-fg", className)}>
      kori<span className="text-fg-3">/os</span>
    </span>
  );
}
