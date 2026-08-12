"use client";

import { cn } from "@/utils";
import { PuhoroMotif } from "./PuhoroMotif";
import { useThemeSettings } from "@/components/providers/ThemeSettingsProvider";

interface EmptyStateProps {
  // reo is optional and only ever set where the design reference actually
  // gives us a translation (currently just the payment-history empty
  // state, "Kāore anō he utu"). Left undefined everywhere else rather than
  // inventing one — see the "no fabricated te reo" note in the rebuild plan.
  title: { reo?: string; en: string };
  description?: string;
  className?: string;
}

export function EmptyState({ title, description, className }: EmptyStateProps) {
  const { bilingual, motif } = useThemeSettings();

  return (
    <div className={cn("flex flex-col items-center justify-center py-10 px-6 text-center", className)}>
      {motif && <PuhoroMotif variant="empty-state" className="mb-3" />}
      <p className="text-[13px] text-[#8f978f]">
        {bilingual && title.reo ? `${title.reo} · ${title.en}` : title.en}
      </p>
      {description && <p className="text-xs text-[#59615b] mt-1 text-pretty">{description}</p>}
    </div>
  );
}
