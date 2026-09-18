import { createHash } from "node:crypto";
import { FICTIONAL_ADULT_CONSTRAINT } from "@/lib/constants";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import { jobLog } from "@/lib/job-log";
import {
  compileComposerPrompt,
  compileStarterPrompt,
  type CompiledPrompt,
  type ComposerSelectionInput,
} from "@/lib/prompt-compiler";

export type PolicyJobKind = "generate_still" | "generate_starter" | "train_pack";

/**
 * Conservative Stage 1 substring list: minors, real-person likeness, and upload/"this is me"
 * language. Not a classifier. Operators can replace it with POLICY_DENYLIST (comma-separated).
 *
 * Bare "celebrity" / "public figure" stay out of the default list — first-party constraint
 * and starter copy already use those words in the safe direction.
 */
export const DEFAULT_POLICY_DENYLIST: readonly string[] = [
  "child",
  "children",
  "minor",
  "underage",
  "under age",
  "teen",
  "teenage",
  "preteen",
  "pre teen",
  "toddler",
  "infant",
  "loli",
  "lolita",
  "shota",
  "schoolgirl",
  "schoolboy",
  "high school",
  "middle school",
  "elementary school",
  "jailbait",
  "kid",
  "kids",
  "real person",
  "real people",
  "real celebrity",
  "photoid",
  "photo id",
  "deepfake",
  "deep fake",
  "face swap",
  "faceswap",
  "lookalike",
  "looks like",
  "based on a real",
  "famous person",
  "this is a real",
  "upload",
  "uploaded",
  "selfie",
  "my photo",
  "my picture",
  "my face",
  "this is me",
  "photo of me",
  "picture of me",
  "reference photo of me",
  "real photo",
  "from this photo",
  "face upload",
  "uploaded face",
  "my likeness",
];

export function normalizePolicyText(text: string): string {
  return text.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function parsePolicyDenylist(
  raw: string | undefined | null,
  fallback: readonly string[] = DEFAULT_POLICY_DENYLIST,
): string[] {
  if (raw == null || raw.trim() === "") {
    return [...fallback];
  }
  const parsed = raw
    .split(",")
    .map((term) => normalizePolicyText(term))
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...fallback];
}

export function resolvePolicyDenylist(raw = process.env.POLICY_DENYLIST): string[] {
  return parsePolicyDenylist(raw);
}

/** Drop first-party safety boilerplate so the constraint cannot self-match a denylist term. */
export function policyScanSurface(prompt: string): string {
  return normalizePolicyText(prompt.split(FICTIONAL_ADULT_CONSTRAINT).join(" "));
}

export function findDeniedSubstring(
  text: string,
  denylist: readonly string[] = DEFAULT_POLICY_DENYLIST,
): string | null {
  const haystack = normalizePolicyText(text);
  for (const term of denylist) {
    const needle = normalizePolicyText(term);
    if (needle && haystack.includes(needle)) {
      return needle;
    }
  }
  return null;
}

/** SHA-256 of a compiled prompt. The prompt string itself is never stored or logged. */
export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

export function assertPromptPolicy(input: {
  prompt: string;
  kind: PolicyJobKind;
  packId?: string;
  denylist?: readonly string[];
  log?: typeof jobLog;
}): void {
  const denylist = input.denylist ?? resolvePolicyDenylist();
  const hit = findDeniedSubstring(policyScanSurface(input.prompt), denylist);
  if (!hit) {
    return;
  }
  const promptHash = hashPrompt(input.prompt);
  (input.log ?? jobLog)("policy.denied", {
    kind: input.kind,
    packId: input.packId,
    promptHash,
    rule: "denylist",
  });
  throw new JobError({
    code: JOB_ERROR_CODES.POLICY_DENIED,
    retryable: false,
  });
}

export function preflightComposerPrompt(
  input: ComposerSelectionInput,
  options?: { denylist?: readonly string[]; log?: typeof jobLog },
): CompiledPrompt {
  const compiled = compileComposerPrompt(input);
  assertPromptPolicy({
    prompt: compiled.prompt,
    kind: "generate_still",
    packId: input.characterPackId,
    denylist: options?.denylist,
    log: options?.log,
  });
  return compiled;
}

export function preflightStarterPrompt(
  input: { characterPackName: string; characterPackId: string; presetId: string },
  options?: { denylist?: readonly string[]; log?: typeof jobLog },
): { prompt: string; negativePrompt: string } {
  const compiled = compileStarterPrompt(input);
  assertPromptPolicy({
    prompt: compiled.prompt,
    kind: "generate_starter",
    packId: input.characterPackId,
    denylist: options?.denylist,
    log: options?.log,
  });
  return compiled;
}

export function compileTrainPolicyBrief(input: {
  characterPackName: string;
  characterPackId: string;
}): string {
  const name = input.characterPackName.trim();
  const id = input.characterPackId.trim();
  if (!name || !id) {
    throw new JobError({
      code: JOB_ERROR_CODES.INVALID_INPUT,
      userMessage: "Character pack is required",
      retryable: false,
    });
  }
  return `${FICTIONAL_ADULT_CONSTRAINT}. training set for synthetic character "${name}" (pack ${id}).`;
}

export function preflightTrainPack(
  input: { characterPackName: string; characterPackId: string },
  options?: { denylist?: readonly string[]; log?: typeof jobLog },
): string {
  const brief = compileTrainPolicyBrief(input);
  assertPromptPolicy({
    prompt: brief,
    kind: "train_pack",
    packId: input.characterPackId,
    denylist: options?.denylist,
    log: options?.log,
  });
  return brief;
}
