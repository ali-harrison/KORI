interface SettingsSectionProps {
  id?: string;
  title: string;
  description?: string;
  status?: React.ReactNode;
  children: React.ReactNode;
}

// Settings reads like a spec sheet: what it is on the left, the detail on the right.
export function SettingsSection({ id, title, description, status, children }: SettingsSectionProps) {
  return (
    <section id={id} className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-x-10 gap-y-4 py-7 border-t border-line scroll-mt-4">
      <div>
        <h2 className="label text-fg-2">{title}</h2>
        {description && <p className="text-[13px] text-fg-3 mt-2 text-pretty">{description}</p>}
        {status && <div className="mt-3">{status}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function SavedNote() {
  return <span role="status" className="text-ok text-xs">Saved</span>;
}
