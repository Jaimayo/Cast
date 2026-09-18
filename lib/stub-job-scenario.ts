import {
  JOB_ERROR_CODES,
  JobError,
  type JobAttempt,
  type JobErrorCode,
} from "@/lib/job-errors";

/**
 * Deterministic stub-mode failures so Train / Generate retry + terminal
 * paths can be reviewed and tested without Venice or RunPod.
 *
 * Set `STUB_JOB_SCENARIO` (process-wide) or, in tests, pass `scenario` into
 * `applyStubGenerateScenario` / `applyStubTrainScenario`. Live mode never
 * reads this — only the stub adapters call these helpers.
 */
export const STUB_JOB_SCENARIOS = [
  "succeed",
  "fail-generate",
  "timeout-generate",
  "provider-error-generate",
  "retry-then-succeed",
  "missing-adapter",
  "fail-train",
  "timeout-train",
  "no-adapter",
  "queue-stall",
] as const;

export type StubJobScenario = (typeof STUB_JOB_SCENARIOS)[number];

export function parseStubJobScenario(value?: string | null): StubJobScenario {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed || trimmed === "succeed" || trimmed === "none" || trimmed === "off") {
    return "succeed";
  }
  if ((STUB_JOB_SCENARIOS as readonly string[]).includes(trimmed)) {
    return trimmed as StubJobScenario;
  }
  return "succeed";
}

export function stubScenarioFromEnv(env: Record<string, string | undefined> = process.env): StubJobScenario {
  return parseStubJobScenario(env.STUB_JOB_SCENARIO);
}

export type StubScenarioOutcome =
  | { action: "succeed" }
  | { action: "fail"; error: JobError };

function fail(code: JobErrorCode, retryable?: boolean, userMessage?: string): StubScenarioOutcome {
  return {
    action: "fail",
    error: new JobError({ code, retryable, userMessage }),
  };
}

/**
 * Generate / starter stub outcome for this worker attempt.
 * `retry-then-succeed` fails attempts 1–2 as a transient network error, then succeeds.
 */
export function resolveStubGenerateOutcome(input: {
  scenario: StubJobScenario;
  attempt?: JobAttempt | number;
}): StubScenarioOutcome {
  const attemptNo =
    typeof input.attempt === "number" ? input.attempt : (input.attempt?.attempt ?? 1);

  switch (input.scenario) {
    case "fail-generate":
      return fail(JOB_ERROR_CODES.GENERATE_STILL_FAILED, false);
    case "timeout-generate":
      return fail(JOB_ERROR_CODES.GENERATE_TIMEOUT, false);
    case "provider-error-generate":
      return fail(
        JOB_ERROR_CODES.PROVIDER_HTTP_ERROR,
        true,
        "The image service is temporarily unavailable. Try again in a moment.",
      );
    case "retry-then-succeed":
      if (attemptNo < 3) {
        return fail(JOB_ERROR_CODES.NETWORK_ERROR, true);
      }
      return { action: "succeed" };
    case "missing-adapter":
      return fail(JOB_ERROR_CODES.GENERATE_MISSING_ADAPTER, false);
    case "queue-stall":
      return fail(JOB_ERROR_CODES.JOB_STALLED, false);
    default:
      return { action: "succeed" };
  }
}

/**
 * Train stub outcome. `no-adapter` succeeds the vendor call with no LoRA
 * pointer so persistAdapterPointer fails closed (TRAIN_NO_ADAPTER).
 */
export function resolveStubTrainOutcome(input: {
  scenario: StubJobScenario;
  attempt?: JobAttempt | number;
}): StubScenarioOutcome {
  const attemptNo =
    typeof input.attempt === "number" ? input.attempt : (input.attempt?.attempt ?? 1);

  switch (input.scenario) {
    case "fail-train":
      return fail(JOB_ERROR_CODES.TRAIN_PACK_FAILED, false);
    case "timeout-train":
      return fail(JOB_ERROR_CODES.TRAIN_POLL_TIMEOUT, false);
    case "queue-stall":
      return fail(JOB_ERROR_CODES.JOB_STALLED, false);
    case "retry-then-succeed":
      if (attemptNo < 3) {
        return fail(JOB_ERROR_CODES.NETWORK_ERROR, true);
      }
      return { action: "succeed" };
    case "provider-error-generate":
      return fail(
        JOB_ERROR_CODES.PROVIDER_HTTP_ERROR,
        true,
        "The image service is temporarily unavailable. Try again in a moment.",
      );
    default:
      return { action: "succeed" };
  }
}

export function applyStubGenerateScenario(input: {
  scenario: StubJobScenario;
  attempt?: JobAttempt | number;
}): void {
  const outcome = resolveStubGenerateOutcome(input);
  if (outcome.action === "fail") {
    throw outcome.error;
  }
}

export function applyStubTrainScenario(input: {
  scenario: StubJobScenario;
  attempt?: JobAttempt | number;
}): void {
  const outcome = resolveStubTrainOutcome(input);
  if (outcome.action === "fail") {
    throw outcome.error;
  }
}

export function stubTrainOmitsAdapter(scenario: StubJobScenario): boolean {
  return scenario === "no-adapter";
}
