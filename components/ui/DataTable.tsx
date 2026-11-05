import Link from "next/link";
import { cn } from "@/utils";

interface DataTableProps {
  // Every row is its own grid, so columns only line up if no row's content can
  // resize them: use minmax(0, Nfr) or fixed widths here, never a bare Nfr.
  gridTemplateColumns: string;
  headers: string[];
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  // Columns stop squashing below this width and the table scrolls sideways
  // inside its own card instead, so a phone never gets a broken layout.
  minWidth?: number;
}

// CSS-grid rows, not a <table> — row separators, hover state, whole-row
// click all live on DataTableRow below.
export function DataTable({ gridTemplateColumns, headers, children, footer, className, minWidth }: DataTableProps) {
  return (
    <div className={cn("bg-[#111412] border border-[#1f2420] rounded-[10px] overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <div style={{ minWidth }}>
          <div
            className="grid gap-3 px-4 py-2.5 text-[11.5px] text-[#646c66]"
            style={{ gridTemplateColumns }}
          >
            {headers.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          {children}
        </div>
      </div>
      {footer}
    </div>
  );
}

interface DataTableRowProps {
  gridTemplateColumns: string;
  // Makes the whole row a real link: prefetched, opens in a new tab, keyboard
  // focusable.
  href?: string;
  children: React.ReactNode;
  className?: string;
}

export function DataTableRow({ gridTemplateColumns, href, children, className }: DataTableRowProps) {
  const rowClassName = cn(
    "grid gap-3 items-center px-4 py-2.5 border-t border-[#191e1a] w-full text-left",
    href && "cursor-pointer hover:bg-[#121613] transition-colors duration-150",
    className
  );

  if (href) {
    return (
      <Link href={href} className={rowClassName} style={{ gridTemplateColumns }}>
        {children}
      </Link>
    );
  }

  return (
    <div className={rowClassName} style={{ gridTemplateColumns }}>
      {children}
    </div>
  );
}
