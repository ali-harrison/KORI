import { cn } from "@/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("text-base font-medium tracking-tight text-[#e7eae8]", className)}>
      kori<span className="text-[var(--accent)]">/os</span>
    </div>
  );
}
