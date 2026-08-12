import { cn } from "@/utils";

// Smaller than StatusBadge, no dot — for payment-history rows specifically.
// No "retried" variant: we don't track GoCardless retry attempts locally
// (it retries automatically on its own side), so there's no real data to
// back that state.
export type PaymentChipVariant = "collected" | "failed" | "manual";

interface PaymentChipProps {
  variant: PaymentChipVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<PaymentChipVariant, string> = {
  collected: "bg-[rgba(63,179,137,0.10)] text-[#5fc9a4] border-[rgba(63,179,137,0.22)]",
  failed: "bg-[rgba(207,114,99,0.12)] text-[#cf7263] border-[rgba(207,114,99,0.25)]",
  manual: "bg-[rgba(154,163,156,0.10)] text-[#9aa39c] border-[rgba(154,163,156,0.22)]",
};

export function PaymentChip({ variant, children, className }: PaymentChipProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-shrink-0 px-[9px] py-[2px] rounded-full text-[11.5px] border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
