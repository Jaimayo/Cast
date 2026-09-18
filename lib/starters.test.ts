import { describe, expect, it } from "vitest";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import { requireStarterPreset } from "@/lib/starters";

describe("requireStarterPreset", () => {
  it("returns a catalog vibe without exposing the hidden fragment on the object used by APIs", () => {
    const preset = requireStarterPreset("face-warm-olive", "face");
    expect(preset.id).toBe("face-warm-olive");
    expect(preset.kind).toBe("face");
    expect(preset.label).toBe("Warm olive");
  });

  it("throws a user-safe INVALID_STARTER with no fragment or internal expected-kind text", () => {
    try {
      requireStarterPreset("not-a-real-vibe");
      throw new Error("expected JobError");
    } catch (err) {
      expect(err).toBeInstanceOf(JobError);
      const jobErr = err as JobError;
      expect(jobErr.code).toBe(JOB_ERROR_CODES.INVALID_STARTER);
      expect(jobErr.userMessage).toBe("That starter isn't valid. Pick a face or body vibe again.");
      expect(jobErr.message).not.toMatch(/fragment|olive skin|preset:/i);
      expect(jobErr.userMessage).not.toContain("not-a-real-vibe");
    }

    try {
      requireStarterPreset("face-warm-olive", "body");
      throw new Error("expected JobError");
    } catch (err) {
      expect(err).toBeInstanceOf(JobError);
      const jobErr = err as JobError;
      expect(jobErr.code).toBe(JOB_ERROR_CODES.INVALID_STARTER);
      expect(jobErr.userMessage).not.toMatch(/expected body|fragment/i);
    }
  });
});
