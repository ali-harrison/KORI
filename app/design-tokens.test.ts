import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The design system, enforced. These fail when someone hardcodes a colour or
// nudges a token below AA, rather than relying on anyone noticing.

const css = readFileSync("app/globals.css", "utf8");

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g)].map((match) => [match[1], match[2]]));
}

const dark = tokens(":root");
const light = { ...dark, ...tokens('[data-theme="light"]') };

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Every way text actually sits on a surface in the app.
const TEXT_PAIRS = [
  ["fg", "bg"], ["fg", "raised"], ["fg", "sunken"],
  ["fg-2", "bg"], ["fg-2", "raised"],
  ["fg-3", "bg"], ["fg-3", "raised"], ["fg-3", "sunken"],
  ["accent", "bg"], ["accent", "raised"],
  ["ok", "bg"], ["warn", "bg"],
  ["on-accent", "accent-fill"],
  ["bg", "fg"],
  ["paper-ink", "paper"], ["paper-muted", "paper"],
];

describe.each([["dark", dark], ["light", light]] as const)("%s theme", (_name, theme) => {
  it.each(TEXT_PAIRS)("%s on %s meets WCAG AA", (foreground, background) => {
    expect(theme[foreground], foreground).toBeDefined();
    expect(theme[background], background).toBeDefined();
    expect(contrast(theme[foreground], theme[background])).toBeGreaterThanOrEqual(4.5);
  });

  it("chart lines are visible against the page (3:1 for graphics)", () => {
    expect(contrast(theme["chart-line"], theme.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(theme["chart-prior"], theme.bg)).toBeGreaterThanOrEqual(2.2);
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(path) && !path.includes(".test.") ? [path] : [];
  });
}

describe("components use tokens, never raw colours", () => {
  // These can't reach the stylesheet: the crash screen is deliberately
  // self-contained, and browser chrome colours are plain metadata.
  const exempt = ["app/global-error.tsx", "app/layout.tsx"];
  const files = [...sourceFiles("app"), ...sourceFiles("components")].filter((file) => !exempt.includes(file));

  it.each(files)("%s", (file) => {
    const source = readFileSync(file, "utf8");
    expect(source.match(/\[#[0-9a-fA-F]{3,8}\]|"#[0-9a-fA-F]{3,8}"|rgba?\(/g)).toBeNull();
  });
});
