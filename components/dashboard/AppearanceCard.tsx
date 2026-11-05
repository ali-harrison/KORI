"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui";
import { ACCENT_OPTIONS, useThemeSettings } from "@/components/providers/ThemeSettingsProvider";
import { cn } from "@/utils";

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-t border-[#191e1a] first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-[13px] text-[#e7eae8]">{label}</p>
        <p className="text-xs text-[#646c66] mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-9 h-5 rounded-full flex-shrink-0 transition-colors duration-150 cursor-pointer",
          checked ? "bg-[var(--accent)]" : "bg-[#262b27]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#0b0d0c] transition-transform duration-150",
            checked && "translate-x-4"
          )}
        />
      </button>
    </div>
  );
}

export function AppearanceCard() {
  const { accent, bilingual, motif, setAccent, setBilingual, setMotif } = useThemeSettings();

  return (
    <Card>
      <CardHeader className="pb-5 mb-5">
        <CardTitle description="Saved on this device">Appearance</CardTitle>
      </CardHeader>
      <div>
        <Toggle
          label="Te reo Māori labels"
          description="Show te reo alongside English in the menu and page titles"
          checked={bilingual}
          onChange={setBilingual}
        />
        <Toggle
          label="Pūhoro motif"
          description="Show the pattern in the sidebar and on empty states"
          checked={motif}
          onChange={setMotif}
        />
      </div>
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#191e1a]">
        <p className="text-[13px] text-[#e7eae8]">Accent colour</p>
        <div className="flex items-center gap-2">
          {ACCENT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAccent(option)}
              aria-label={`Use accent colour ${option}`}
              aria-pressed={accent === option}
              className={cn(
                "w-6 h-6 rounded-full cursor-pointer outline-offset-2",
                accent === option && "outline-2 outline-[#e7eae8]"
              )}
              style={{ backgroundColor: option }}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
