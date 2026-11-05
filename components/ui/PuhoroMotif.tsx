// Pūhoro-derived motif — concentric thin arcs in the accent color at low
// opacity. Structural, not decorative: used ONLY here (sidebar footer) and
// in EmptyState, never to skin whole surfaces.
interface PuhoroMotifProps {
  variant?: "sidebar" | "empty-state";
  className?: string;
}

export function PuhoroMotif({ variant = "sidebar", className }: PuhoroMotifProps) {
  if (variant === "empty-state") {
    return (
      <svg width="72" height="36" viewBox="0 0 72 36" className={`puhoro-motif block mx-auto ${className ?? ""}`}>
        <circle cx="36" cy="40" r="26" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.3" />
        <circle cx="36" cy="40" r="17" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.2" />
        <circle cx="36" cy="40" r="8" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.12" />
      </svg>
    );
  }

  return (
    <svg width="228" height="84" viewBox="0 0 228 84" className={`puhoro-motif block ${className ?? ""}`}>
      <circle cx="24" cy="86" r="30" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.28" />
      <circle cx="24" cy="86" r="21" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.22" />
      <circle cx="24" cy="86" r="12" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.16" />
      <circle cx="78" cy="98" r="34" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.2" />
      <circle cx="78" cy="98" r="24" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.14" />
      <circle cx="140" cy="108" r="38" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.13" />
      <circle cx="140" cy="108" r="27" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.09" />
      <circle cx="206" cy="116" r="40" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.07" />
    </svg>
  );
}
