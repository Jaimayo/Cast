import { describe, expect, it } from "vitest";
import {
  STUB_PREVIEW_SESSION_SECRET,
  isMemoryPreviewMode,
  previewPackId,
  stubSessionSecret,
} from "@/lib/memory-preview";

describe("stub memory preview", () => {
  it("is on only when stub and DATABASE_URL is unset", () => {
    expect(isMemoryPreviewMode({ providerMode: "stub" })).toBe(true);
    expect(isMemoryPreviewMode({ providerMode: "stub", databaseUrl: "" })).toBe(true);
    expect(isMemoryPreviewMode({ providerMode: "stub", databaseUrl: "postgres://cast" })).toBe(false);
    expect(isMemoryPreviewMode({ providerMode: "live" })).toBe(false);
  });

  it("defaults SESSION_SECRET only in stub", () => {
    expect(stubSessionSecret("stub")).toBe(STUB_PREVIEW_SESSION_SECRET);
    expect(stubSessionSecret("stub", "  ")).toBe(STUB_PREVIEW_SESSION_SECRET);
    expect(stubSessionSecret("stub", "custom-secret")).toBe("custom-secret");
    expect(stubSessionSecret("live")).toBeUndefined();
    expect(stubSessionSecret("live", "custom-secret")).toBe("custom-secret");
  });

  it("derives stable pack ids from a user uuid", () => {
    const userId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    expect(previewPackId(userId, "locked")).toBe("aaaaaaaa-bbbb-cccc-dddd-000000000001");
    expect(previewPackId(userId, "draft")).toBe("aaaaaaaa-bbbb-cccc-dddd-000000000002");
    expect(previewPackId("not-a-uuid", "locked")).toBe("00000000-0000-4000-8000-000000000001");
  });
});
