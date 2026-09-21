import { describe, expect, it } from "vitest";
import { LOCK_SOUL_ID_FIRST } from "@/lib/soul";
import {
  GENERATE_IN_PROGRESS_COPY,
  GENERATE_LABEL_IN_PROGRESS,
  GENERATE_LABEL_QUEUEING,
  GENERATE_REASON_ATTEST,
  GENERATE_REASON_POSE,
  canGenerateStill,
  generateButtonLabel,
  generateDisabledReason,
} from "@/lib/generate-affordances";

describe("generateDisabledReason", () => {
  it("blocks unlocked character, missing pose, and missing attest", () => {
    expect(
      generateDisabledReason({ attested: false, locked: true, poseChipId: "standing-neutral" }),
    ).toBe(GENERATE_REASON_ATTEST);
    expect(generateDisabledReason({ attested: true, locked: false, poseChipId: "standing-neutral" })).toBe(
      LOCK_SOUL_ID_FIRST,
    );
    expect(GENERATE_REASON_POSE).toBe("Choose a pose to generate.");
    expect(generateDisabledReason({ attested: true, locked: true, poseChipId: "" })).toBe(GENERATE_REASON_POSE);
    expect(generateDisabledReason({ attested: true, locked: true, poseChipId: "standing-neutral" })).toBeUndefined();
    expect(canGenerateStill({ attested: true, locked: true, poseChipId: "standing-neutral" })).toBe(true);
    expect(canGenerateStill({ attested: true, locked: false, poseChipId: "standing-neutral" })).toBe(false);
  });
});

describe("generateButtonLabel", () => {
  it("shows queueing then generating", () => {
    expect(generateButtonLabel({ pending: false, inProgress: false })).toBe("Generate");
    expect(generateButtonLabel({ pending: true, inProgress: false })).toBe(GENERATE_LABEL_QUEUEING);
    expect(generateButtonLabel({ pending: false, inProgress: true })).toBe(GENERATE_LABEL_IN_PROGRESS);
    expect(GENERATE_IN_PROGRESS_COPY).toMatch(/Generating/);
  });
});
