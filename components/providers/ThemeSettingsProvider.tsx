"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const ACCENT_OPTIONS = ["#3fb389", "#54c29b", "#3aa8a0", "#8fb47c"] as const;
export type AccentOption = (typeof ACCENT_OPTIONS)[number];

const DEFAULTS = {
  accent: "#54c29b" as AccentOption,
  bilingual: true,
  motif: true,
};

const STORAGE_KEY = "kori-os-theme-settings";

interface ThemeSettings {
  accent: AccentOption;
  bilingual: boolean;
  motif: boolean;
}

interface ThemeSettingsContextValue extends ThemeSettings {
  setAccent: (accent: AccentOption) => void;
  setBilingual: (bilingual: boolean) => void;
  setMotif: (motif: boolean) => void;
}

const ThemeSettingsContext = createContext<ThemeSettingsContextValue | null>(null);

// Client-side only, not persisted to Supabase — a per-gym settings column
// is a real schema change, out of scope for a visual rebuild. Defaults
// match the design spec exactly, so SSR and first paint are always correct
// even before localStorage is read (avoids a hydration flash).
export function ThemeSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULTS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings((prev) => ({ ...prev, ...JSON.parse(stored) }));
    } catch {
      // Ignore malformed/inaccessible storage — defaults already applied.
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", settings.accent);
    // Mirrored onto the DOM for the Bilingual component and .puhoro-motif
    // (globals.css), since server-rendered pages can't read this context.
    document.documentElement.dataset.bilingual = String(settings.bilingual);
    document.documentElement.dataset.motif = String(settings.motif);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage full/unavailable — theme still works for this session.
    }
  }, [settings]);

  const value: ThemeSettingsContextValue = {
    ...settings,
    setAccent: (accent) => setSettings((prev) => ({ ...prev, accent })),
    setBilingual: (bilingual) => setSettings((prev) => ({ ...prev, bilingual })),
    setMotif: (motif) => setSettings((prev) => ({ ...prev, motif })),
  };

  return <ThemeSettingsContext.Provider value={value}>{children}</ThemeSettingsContext.Provider>;
}

export function useThemeSettings(): ThemeSettingsContextValue {
  const ctx = useContext(ThemeSettingsContext);
  if (!ctx) throw new Error("useThemeSettings must be used within ThemeSettingsProvider");
  return ctx;
}
