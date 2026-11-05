import { cn } from "@/utils";
import { Poutama } from "./Poutama";

interface EmptyStateProps {
  // reo is only ever set where a translation was actually given to us. Left
  // undefined everywhere else rather than inventing one.
  title: { reo?: string; en: string };
  description?: string;
  className?: string;
  children?: React.ReactNode;
  // When this is the whole page rather than a gap inside one.
  pageTitle?: boolean;
}

export function EmptyState({ title, description, className, children, pageTitle = false }: EmptyStateProps) {
  const Title = pageTitle ? "h1" : "p";

  return (
    <div className={cn("flex flex-col items-center justify-center py-10 px-6 text-center", className)}>
      <Poutama width={72} height={24} spacing={18} step={6} className="mb-4" />
      <Title className="text-fg-2">
        {title.reo && <span className="reo" lang="mi">{title.reo} · </span>}
        {title.en}
      </Title>
      {description && <p className="text-fg-3 text-[13px] mt-1 text-pretty">{description}</p>}
      {children}
    </div>
  );
}
