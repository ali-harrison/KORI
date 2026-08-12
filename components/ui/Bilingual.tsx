// Renders "reo · en" (or just "en" if no reo is given). No "use client" —
// works inside server components because it always renders both spans;
// CSS (globals.css, keyed on a data-bilingual attribute the
// ThemeSettingsProvider maintains) does the showing/hiding, not React
// state. reo is deliberately optional: only pass it where the design
// reference actually gives a translation — never invented.
interface BilingualProps {
  reo?: string;
  en: string;
  separator?: string;
}

export function Bilingual({ reo, en, separator = " · " }: BilingualProps) {
  if (!reo) return <>{en}</>;
  return (
    <>
      <span className="bilingual-reo">
        {reo}
        {separator}
      </span>
      <span className="bilingual-en">{en}</span>
    </>
  );
}
