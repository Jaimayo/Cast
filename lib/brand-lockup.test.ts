import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AGE_ATTEST_COPY } from "@/lib/age-attest";

function readBrand(name: string) {
  return readFileSync(resolve(process.cwd(), "public/brand", name), "utf8");
}

describe("locked L1 brand pack", () => {
  it("serves the aligned L1 lockup on the production filename", () => {
    const svg = readBrand("cast-lockup-l1-transparent.svg");
    expect(svg).toContain('viewBox="0 0 280 40"');
    expect(svg).toContain('dominant-baseline="central"');
    expect(svg).toContain("translate(22,20)");
    expect(svg).toContain("#C4A574");
    expect(svg).toContain("#F4F1EA");
    expect(svg).toContain("CAST");
  });

  it("keeps W1, F1, and favicon on the locked filenames", () => {
    expect(readBrand("cast-wordmark-w1-transparent.svg")).toContain('viewBox="0 0 200 40"');
    expect(readBrand("cast-mark-f1.svg")).toContain("Cast F1 mark");
    expect(readBrand("cast-favicon.svg")).toContain("Cast favicon");
    expect(readFileSync(resolve(process.cwd(), "public/favicon.svg"), "utf8")).toContain("Cast favicon");
  });

  it("does not change the locked 18+ attest copy", () => {
    expect(AGE_ATTEST_COPY).toBe("I confirm I am 18+.");
  });
});
