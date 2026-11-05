// Per-device display preferences. Kept out of the database on purpose: they're
// about this screen, not the gym.

export type ThemePreference = "system" | "light" | "dark";

export interface Appearance {
  theme: ThemePreference;
  bilingual: boolean;
  pattern: boolean;
}

export const APPEARANCE_KEY = "kori-appearance";

export const DEFAULT_APPEARANCE: Appearance = { theme: "system", bilingual: true, pattern: true };

// Inlined into <head> so the right theme is on <html> before anything paints.
// Plain ES5, no imports: it runs before any bundle has loaded.
export const APPEARANCE_SCRIPT = `(function () {
  var a = {};
  try { a = JSON.parse(localStorage.getItem(${JSON.stringify(APPEARANCE_KEY)})) || {}; } catch (e) {}
  var t = a.theme === "light" || a.theme === "dark" ? a.theme
    : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  var d = document.documentElement.dataset;
  d.theme = t;
  d.bilingual = String(a.bilingual !== false);
  d.pattern = String(a.pattern !== false);
})();`;

export function applyAppearance(appearance: Appearance): void {
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const { dataset } = document.documentElement;
  dataset.theme = appearance.theme === "system" ? (prefersLight ? "light" : "dark") : appearance.theme;
  dataset.bilingual = String(appearance.bilingual);
  dataset.pattern = String(appearance.pattern);
}

export function readAppearance(): Appearance {
  try {
    return { ...DEFAULT_APPEARANCE, ...JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? "{}") };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearance(appearance: Appearance): void {
  applyAppearance(appearance);
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
  } catch {
    // Storage full or blocked: it still applies for this visit.
  }
}
