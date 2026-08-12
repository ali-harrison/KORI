import { cn } from "@/utils";

interface DataTableProps {
  gridTemplateColumns: string;
  headers: string[];
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

// CSS-grid rows, not a <table> — row separators, hover state, whole-row
// click all live on DataTableRow below.
export function DataTable({ gridTemplateColumns, headers, children, footer, className }: DataTableProps) {
  return (
    <div className={cn("bg-[#111412] border border-[#1f2420] rounded-[10px] overflow-hidden", className)}>
      <div
        className="grid gap-3 px-4 py-2.5 text-[11.5px] text-[#646c66]"
        style={{ gridTemplateColumns }}
      >
        {headers.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      {children}
      {footer}
    </div>
  );
}

interface DataTableRowProps {
  gridTemplateColumns: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function DataTableRow({ gridTemplateColumns, onClick, children, className }: DataTableRowProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "grid gap-3 items-center px-4 py-2.5 border-t border-[#191e1a] w-full text-left",
        onClick && "cursor-pointer hover:bg-[#121613] transition-colors duration-150",
        className
      )}
      style={{ gridTemplateColumns }}
    >
      {children}
    </Tag>
  );
}
