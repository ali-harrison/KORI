import { cn } from "@/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
  onClick?: () => void;
  id?: string;
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-4 md:p-[18px]",
  lg: "p-6",
};

export function Card({
  children,
  className,
  padding = "md",
  hoverable = false,
  onClick,
  id,
}: CardProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      id={id}
      onClick={onClick}
      className={cn(
        "relative rounded-[10px]",
        "bg-[#111412]",
        "border border-[#1f2420]",
        paddingStyles[padding],
        hoverable &&
          "cursor-pointer transition-colors duration-150 hover:bg-[#141814]",
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
        "border-b border-[#1f2420]",
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
      <h3 className="text-[13px] font-medium text-[#e7eae8] leading-snug">
        {children}
      </h3>
      {description && (
        <p className="text-xs text-[#8f978f] leading-snug">{description}</p>
      )}
    </div>
  );
}
