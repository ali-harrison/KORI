// Renders "reo · en", or just "en" when there's no te reo for it. reo is only
// passed where a translation was actually given to us, never invented. CSS does
// the switching (globals.css), so this works in server components with no flash.
interface BilingualProps {
  reo?: string;
  en: string;
  separator?: string;
}

export function Bilingual({ reo, en, separator = " · " }: BilingualProps) {
  if (!reo) return <>{en}</>;
  return (
    <>
      <span className="reo" lang="mi">{reo}{separator}</span>
      {en}
    </>
  );
}
