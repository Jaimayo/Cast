import { describe, expect, it } from "vitest";
import { stubDemoLockMessage } from "@/lib/demo-pack";

describe("stub demo lock", () => {
  it("allows only stub provider mode", () => {
    expect(stubDemoLockMessage("stub")).toBeNull();
    expect(stubDemoLockMessage("live")).toMatch(/PROVIDER_MODE=stub/);
  });
});
