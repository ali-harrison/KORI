import { cn } from "@/utils";

interface PanelProps {
  title?: React.ReactNode;
  // A short mono note on the right of the header: a count, a total.
  meta?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

// One cell of a seams grid, or a section on its own.
export function Panel({ title, meta, action, children, className, id }: PanelProps) {
  return (
    <section id={id} className={cn("bg-bg min-w-0 scroll-mt-4", className)}>
      {(title || meta || action) && (
        <header className="flex items-center justify-between gap-3 min-h-11 px-4 py-2.5 border-b border-line">
          {title && <h2 className="label">{title}</h2>}
          <div className="flex items-center gap-3 min-w-0">
            {meta && <span className="label">{meta}</span>}
            {action}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}

interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, lede, actions }: PageHeaderProps) {
  return (
    <header className="enter flex flex-wrap items-end justify-between gap-x-8 gap-y-4 mb-6 sm:mb-8">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="label mb-3">{eyebrow}</p>}
        <h1 className="text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.06] tracking-[-0.03em] text-balance">{title}</h1>
        {lede && <p className="text-fg-2 mt-3 text-pretty">{lede}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </header>
  );
}
