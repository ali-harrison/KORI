import { describe, it, expect } from "vitest";
import { renderTemplate } from "@/lib/templates";

describe("renderTemplate", () => {
  it("substitutes every occurrence of a token", () => {
    const result = renderTemplate("Hi {{name}}, welcome {{name}}!", { name: "Aroha" });
    expect(result).toBe("Hi Aroha, welcome Aroha!");
  });

  it("substitutes multiple distinct tokens", () => {
    const result = renderTemplate("{{a}} and {{b}}", { a: "one", b: "two" });
    expect(result).toBe("one and two");
  });

  it("renders an unknown token as blank, not the literal placeholder", () => {
    const result = renderTemplate("Hi {{name}}, {{unknown}}!", { name: "Aroha" });
    expect(result).toBe("Hi Aroha, !");
  });

  it("leaves template text with no tokens untouched", () => {
    const result = renderTemplate("No tokens here.", { name: "Aroha" });
    expect(result).toBe("No tokens here.");
  });
});
