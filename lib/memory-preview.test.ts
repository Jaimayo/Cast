import { describe, expect, it } from "vitest";
import {
  STUB_PREVIEW_SESSION_SECRET,
  isMemoryPreviewMode,
  stubSessionSecret,
} from "@/lib/memory-preview";

describe("stub memory preview", () => {
  it("is on only when stub and DATABASE_URL is unset", () => {
    expect(isMemoryPreviewMode({ providerMode: "stub" })).toBe(true);
    expect(isMemoryPreviewMode({ providerMode: "stub", databaseUrl: "" })).toBe(true);
    expect(isMemoryPreviewMode({ providerMode: "stub", databaseUrl: "postgres://cast" })).toBe(false);
    expect(isMemoryPreviewMode({ providerMode: "live" })).toBe(false);
    expect(isMemoryPreviewMode({ providerMode: "live", databaseUrl: "postgres://cast" })).toBe(false);
  });

  it("defaults SESSION_SECRET only in stub", () => {
    expect(stubSessionSecret("stub")).toBe(STUB_PREVIEW_SESSION_SECRET);
    expect(stubSessionSecret("stub", "  ")).toBe(STUB_PREVIEW_SESSION_SECRET);
    expect(stubSessionSecret("stub", "custom-secret")).toBe("custom-secret");
    expect(stubSessionSecret("live")).toBeUndefined();
    expect(stubSessionSecret("live", "custom-secret")).toBe("custom-secret");
  });
});
