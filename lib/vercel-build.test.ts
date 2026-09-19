import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("vercel-build entrypoint", () => {
  it("is wired so cast-stage1-review can run pnpm vercel-build", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["vercel-build"]).toBe("tsx scripts/vercel-build.ts");
    expect(pkg.scripts?.["review:bootstrap"]).toBe("tsx scripts/bootstrap-review.ts");

    const script = readFileSync(resolve(process.cwd(), "scripts/vercel-build.ts"), "utf8");
    expect(script).toContain("stub memory preview");
    expect(script).toContain('run("pnpm", ["exec", "next", "build"])');

    const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
      buildCommand?: string;
    };
    expect(vercel.buildCommand).toBe("pnpm vercel-build");
  });
});
