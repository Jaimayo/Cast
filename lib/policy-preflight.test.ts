import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COMPOSER_CHIPS } from "@/lib/chips";
import { FICTIONAL_ADULT_CONSTRAINT } from "@/lib/constants";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import {
  DEFAULT_POLICY_DENYLIST,
  assertPromptPolicy,
  compileTrainPolicyBrief,
  findDeniedSubstring,
  hashPrompt,
  parsePolicyDenylist,
  policyScanSurface,
  preflightComposerPrompt,
  preflightStarterPrompt,
  preflightTrainPack,
} from "@/lib/policy-preflight";
import { STARTER_PRESETS } from "@/lib/starters";

const mara = {
  characterPackName: "Mara",
  characterPackId: "pack_123",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("policy denylist config", () => {
  it("uses conservative defaults when unset or blank", () => {
    expect(parsePolicyDenylist(undefined)).toEqual([...DEFAULT_POLICY_DENYLIST]);
    expect(parsePolicyDenylist("  ")).toEqual([...DEFAULT_POLICY_DENYLIST]);
    expect(DEFAULT_POLICY_DENYLIST).toEqual(expect.arrayContaining(["child", "real person", "upload", "selfie"]));
  });

  it("replaces the default list from a comma-separated override", () => {
    expect(parsePolicyDenylist(" selfie , Face-Swap ")).toEqual(["selfie", "face swap"]);
  });
});

describe("required chips / vibes", () => {
  it("blocks empty Pose with POSE_REQUIRED and does not compile", () => {
    try {
      preflightComposerPrompt({ ...mara, poseChipId: "" });
      throw new Error("expected JobError");
    } catch (err) {
      expect(err).toBeInstanceOf(JobError);
      expect((err as JobError).code).toBe(JOB_ERROR_CODES.POSE_REQUIRED);
      expect((err as JobError).userMessage).toBe("Pose is required");
    }
    expect(() => preflightComposerPrompt({ ...mara, poseChipId: "   " })).toThrow(JobError);
  });

  it("blocks unknown or cross-family chips with INVALID_CHIP and no fragment", () => {
    try {
      preflightComposerPrompt({ ...mara, poseChipId: "not-a-chip" });
      throw new Error("expected JobError");
    } catch (err) {
      expect(err).toBeInstanceOf(JobError);
      const jobErr = err as JobError;
      expect(jobErr.code).toBe(JOB_ERROR_CODES.INVALID_CHIP);
      expect(jobErr.userMessage).toBe("That chip isn't valid. Choose chips again and generate.");
      expect(jobErr.message).not.toMatch(/fragment|standing upright|softbox/i);
    }
    expect(() => preflightComposerPrompt({ ...mara, poseChipId: "softbox" })).toThrow(JobError);
  });

  it("treats blank optional chips as omitted, not invalid", () => {
    const compiled = preflightComposerPrompt({
      ...mara,
      poseChipId: "standing-neutral",
      outfitChipId: "  ",
      sceneChipId: "",
      lightingChipId: null,
    });
    expect(compiled.chips.pose.id).toBe("standing-neutral");
    expect(compiled.chips.outfit).toBeUndefined();
  });

  it("blocks a missing starter vibe with INVALID_STARTER", () => {
    try {
      preflightStarterPrompt({ ...mara, presetId: "" });
      throw new Error("expected JobError");
    } catch (err) {
      expect(err).toBeInstanceOf(JobError);
      expect((err as JobError).code).toBe(JOB_ERROR_CODES.INVALID_STARTER);
    }
  });

  it("blocks a missing character pack name on train with INVALID_INPUT", () => {
    try {
      preflightTrainPack({ characterPackName: "  ", characterPackId: "pack_123" });
      throw new Error("expected JobError");
    } catch (err) {
      expect(err).toBeInstanceOf(JobError);
      expect((err as JobError).code).toBe(JOB_ERROR_CODES.INVALID_INPUT);
      expect((err as JobError).userMessage).toBe("Character pack is required");
    }
  });
});

describe("compiled prompt denylist stub", () => {
  it("lets every first-party chip and starter compile under the default list", () => {
    for (const pose of COMPOSER_CHIPS.pose) {
      expect(() =>
        preflightComposerPrompt({
          ...mara,
          poseChipId: pose.id,
          outfitChipId: "lingerie",
          sceneChipId: "hotel-suite",
          lightingChipId: "candle-warm",
          bodyChipId: "soft-hourglass",
        }),
      ).not.toThrow();
    }
    for (const preset of STARTER_PRESETS) {
      expect(() => preflightStarterPrompt({ ...mara, presetId: preset.id })).not.toThrow();
    }
    expect(() => preflightTrainPack(mara)).not.toThrow();
  });

  it("does not scan the negative prompt (which lists blocked terms on purpose)", () => {
    const compiled = preflightComposerPrompt({ ...mara, poseChipId: "standing-neutral" });
    expect(compiled.negativePrompt.toLowerCase()).toMatch(/child|teen|celebrity/);
    expect(findDeniedSubstring(policyScanSurface(compiled.prompt))).toBeNull();
  });

  it("strips the fictional-adult constraint so first-party copy cannot self-match", () => {
    const brief = compileTrainPolicyBrief(mara);
    expect(brief).toContain(FICTIONAL_ADULT_CONSTRAINT);
    expect(policyScanSurface(brief)).not.toContain("celebrity");
    expect(findDeniedSubstring(policyScanSurface(brief))).toBeNull();
  });

  it("blocks a pack name with minor / real-person / upload language and logs hash only", () => {
    const logs: Array<{ event: string; fields: Record<string, unknown> }> = [];
    const log = (event: string, fields: Record<string, unknown> = {}) => {
      logs.push({ event, fields });
    };

    const cases = [
      { name: "Child star", kind: "minors" },
      { name: "real-person muse", kind: "real-person" },
      { name: "upload selfie", kind: "upload" },
    ] as const;

    for (const row of cases) {
      logs.length = 0;
      const input = { characterPackName: row.name, characterPackId: "pack_123", poseChipId: "standing-neutral" };
      try {
        preflightComposerPrompt(input, { log });
        throw new Error(`expected deny for ${row.kind}`);
      } catch (err) {
        expect(err).toBeInstanceOf(JobError);
        expect((err as JobError).code).toBe(JOB_ERROR_CODES.POLICY_DENIED);
        expect((err as JobError).userMessage).toMatch(/fictional adults only/i);
        expect((err as JobError).userMessage).not.toMatch(/child star|selfie|prompt/i);
      }
      expect(logs).toHaveLength(1);
      expect(logs[0]?.event).toBe("policy.denied");
      expect(logs[0]?.fields.kind).toBe("generate_still");
      expect(logs[0]?.fields.rule).toBe("denylist");
      expect(logs[0]?.fields.promptHash).toMatch(/^[a-f0-9]{64}$/);
      const serialized = JSON.stringify(logs[0]);
      expect(serialized).not.toMatch(/Child star|real-person muse|upload selfie|wholly fictional/i);
      expect(serialized).not.toContain(row.name);
    }
  });

  it("blocks starters and Train & lock on the same denylist surface", () => {
    const silent = () => {};
    expect(() =>
      preflightStarterPrompt(
        { characterPackName: "teen vibe", characterPackId: "pack_1", presetId: "face-warm-olive" },
        { log: silent },
      ),
    ).toThrow(JobError);
    expect(() =>
      preflightTrainPack({ characterPackName: "my face ref", characterPackId: "pack_1" }, { log: silent }),
    ).toThrow(JobError);
    try {
      preflightTrainPack({ characterPackName: "underage muse", characterPackId: "pack_1" }, { log: silent });
      throw new Error("expected JobError");
    } catch (err) {
      expect((err as JobError).code).toBe(JOB_ERROR_CODES.POLICY_DENIED);
    }
  });

  it("honors an operator override list and still never logs the prompt", () => {
    const logs: Array<Record<string, unknown>> = [];
    const selection = { ...mara, poseChipId: "standing-neutral", sceneChipId: "cyc-studio" };
    expect(() => preflightComposerPrompt(selection)).not.toThrow();

    try {
      preflightComposerPrompt(selection, {
        denylist: ["cyclorama"],
        log: (_event, fields = {}) => {
          logs.push(fields);
        },
      });
      throw new Error("expected deny");
    } catch (err) {
      expect((err as JobError).code).toBe(JOB_ERROR_CODES.POLICY_DENIED);
    }

    const allowed = preflightComposerPrompt({ ...mara, poseChipId: "standing-neutral" });
    expect(logs[0]?.promptHash).toMatch(/^[a-f0-9]{64}$/);
    expect(logs[0]?.promptHash).not.toBe(hashPrompt(allowed.prompt));
    expect(JSON.stringify(logs)).not.toMatch(/cyclorama|seamless/i);
  });

  it("hashes the compiled prompt with sha256 and never returns the prompt from the logger", () => {
    const prompt = `${FICTIONAL_ADULT_CONSTRAINT}. training set for synthetic character "teen" (pack p1).`;
    const expected = createHash("sha256").update(prompt).digest("hex");
    expect(hashPrompt(prompt)).toBe(expected);
    const logs: Array<Record<string, unknown>> = [];
    expect(() =>
      assertPromptPolicy({
        prompt,
        kind: "train_pack",
        packId: "p1",
        log: (_event, fields = {}) => {
          logs.push(fields);
        },
      }),
    ).toThrow(JobError);
    expect(logs[0]?.promptHash).toBe(expected);
    expect(Object.keys(logs[0] ?? {})).toEqual(["kind", "packId", "promptHash", "rule"]);
  });

  it("matches collapsed punctuation variants (real-person, face_swap)", () => {
    expect(findDeniedSubstring("a real-person portrait")).toBe("real person");
    expect(findDeniedSubstring("please face_swap this")).toBe("face swap");
    expect(findDeniedSubstring("standing upright, full-body")).toBeNull();
  });
});
