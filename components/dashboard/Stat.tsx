import Link from "next/link";
import { cn } from "@/utils";

interface StatProps {
  label: string;
  value: string | number;
  note?: React.ReactNode;
  // Where the rows behind this number live. Every figure can show its working.
  href: string;
  attention?: boolean;
  className?: string;
}

export function Stat({ label, value, note, href, attention = false, className }: StatProps) {
  return (
    <Link href={href} data-stat={label} className={cn("block bg-bg min-w-0 p-4 sm:p-5 hover:bg-glow transition-colors duration-150", className)}>
      <p className="label">{label}</p>
      <p className={cn("text-[clamp(1.75rem,3vw,2.5rem)] leading-none tracking-[-0.03em] mt-3 tabular-nums", attention && "text-accent")}>{value}</p>
      {note && <p className="text-xs text-fg-3 mt-2.5 text-pretty">{note}</p>}
    </Link>
  );
}
