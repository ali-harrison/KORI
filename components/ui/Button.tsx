import { cn } from "@/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control transition-colors duration-150 cursor-pointer select-none disabled:opacity-45 disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent-fill text-on-accent font-medium hover:brightness-110",
  secondary: "border border-line-strong text-fg hover:bg-raised",
  ghost: "text-fg-2 hover:text-fg hover:bg-raised",
  danger: "border border-accent text-accent hover:bg-glow",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-3.5 text-[13px]",
  lg: "h-11 px-5 text-sm",
};

// For a link styled as a button. Nesting a <button> in an <a> is invalid HTML
// and puts two tab stops on one control.
export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string): string {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({ variant = "secondary", size = "md", loading = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && (
        <span aria-hidden className="size-3 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
