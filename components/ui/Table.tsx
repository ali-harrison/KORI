import Link from "next/link";
import { cn } from "@/utils";

interface TableProps {
  // Names the table for screen readers, and the scroll region when it has one.
  caption: string;
  // Below this width the table scrolls inside its own panel rather than
  // squashing its columns.
  minWidth?: number;
  children: React.ReactNode;
}

export function Table({ caption, minWidth, children }: TableProps) {
  const table = (
    <table className="w-full border-collapse text-left" style={{ minWidth }}>
      <caption className="sr-only">{caption}</caption>
      {children}
    </table>
  );
  if (!minWidth) return table;
  return (
    // relative: visually hidden text inside is position:absolute, and without a
    // positioned parent it escapes the scroll area and widens the whole page.
    <div role="region" aria-label={caption} tabIndex={0} className="relative overflow-x-auto">
      {table}
    </div>
  );
}

export function Th({ children, align = "left", className }: { children?: React.ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <th scope="col" className={cn("label font-normal px-4 py-2.5 border-b border-line whitespace-nowrap", align === "right" && "text-right", className)}>
      {children}
    </th>
  );
}

export function Td({ children, align = "left", className }: { children?: React.ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <td className={cn("px-4 py-3 border-b border-line align-middle", align === "right" && "text-right tabular-nums", className)}>
      {children}
    </td>
  );
}

export function Tr({ children, clickable = false }: { children: React.ReactNode; clickable?: boolean }) {
  return <tr className={cn("last:[&>td]:border-b-0", clickable && "relative hover:bg-glow transition-colors duration-150")}>{children}</tr>;
}

// The row's one real link. Its hit area stretches over the whole <tr>, so the
// row is clickable while keeping a single tab stop and a proper link: it opens
// in a new tab and reads correctly to a screen reader.
export function RowLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent focus-visible:after:-outline-offset-2", className)}>
      {children}
    </Link>
  );
}
