import { cn } from "@/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
  onClick?: () => void;
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  children,
  className,
  padding = "md",
  hoverable = false,
  onClick,
}: CardProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={cn(
        "relative rounded-[8px]",
        "bg-[#111111]",
        "border border-[rgba(255,255,255,0.06)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        paddingStyles[padding],
        hoverable &&
          "cursor-pointer transition-all duration-150 hover:bg-[#141414] hover:border-[rgba(255,255,255,0.1)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(255,255,255,0.04)]",
        onClick && "w-full text-left",
        className
      )}
    >
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between pb-4",
        "border-b border-[rgba(255,255,255,0.06)]",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  description?: string;
}

export function CardTitle({ children, className, description }: CardTitleProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <h3 className="text-sm font-semibold text-[#f5f5f5] leading-snug">
        {children}
      </h3>
      {description && (
        <p className="text-xs text-[#888888] leading-snug">{description}</p>
      )}
    </div>
  );
}
