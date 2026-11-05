"use client";

import { useEffect, useState } from "react";
import { DEFAULT_APPEARANCE, readAppearance, saveAppearance, type Appearance, type ThemePreference } from "@/lib/appearance";
import { cn } from "@/utils";
import { SettingsSection } from "./SettingsSection";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-t border-line">
      <div className="min-w-0">
        <p>{label}</p>
        <p className="text-xs text-fg-3 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative w-9 h-5 flex-shrink-0 border transition-colors duration-150 cursor-pointer", checked ? "bg-fg border-fg" : "bg-transparent border-line-strong")}
      >
        <span aria-hidden className={cn("absolute top-0.5 left-0.5 size-3.5 transition-transform duration-150", checked ? "translate-x-4 bg-bg" : "bg-fg-3")} />
      </button>
    </div>
  );
}

export function AppearanceCard() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);

  useEffect(() => setAppearance(readAppearance()), []);

  function update(changes: Partial<Appearance>) {
    const next = { ...appearance, ...changes };
    setAppearance(next);
    saveAppearance(next);
  }

  return (
    <SettingsSection title="Appearance" description="Saved on this device.">
      <div role="radiogroup" aria-label="Theme" className="flex border border-line-strong mb-4 w-fit max-w-full">
        {THEMES.map((theme) => (
          <button
            key={theme.value}
            type="button"
            role="radio"
            aria-checked={appearance.theme === theme.value}
            onClick={() => update({ theme: theme.value })}
            className={cn("h-9 px-3.5 text-[13px] transition-colors duration-150 cursor-pointer", appearance.theme === theme.value ? "bg-fg text-bg" : "text-fg-2 hover:text-fg")}
          >
            {theme.label}
          </button>
        ))}
      </div>
      <Toggle label="Te reo Māori labels" description="Show te reo alongside English in the menu and page titles" checked={appearance.bilingual} onChange={(bilingual) => update({ bilingual })} />
      <Toggle label="Poutama pattern" description="Show the stepped pattern in the sidebar and on empty states" checked={appearance.pattern} onChange={(pattern) => update({ pattern })} />
    </SettingsSection>
  );
}
