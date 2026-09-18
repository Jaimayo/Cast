export const HEALTH_SERVICE = "cast" as const;
export const HEALTH_STAGE = 1 as const;

/** Per-probe cap so readiness cannot hang a load balancer or ops poll. */
export const HEALTH_PROBE_TIMEOUT_MS = 1500;

export const HEALTH_CHECK_NAMES = ["postgres", "redis", "queue"] as const;
export type HealthCheckName = (typeof HEALTH_CHECK_NAMES)[number];

export type HealthProbe = () => Promise<void>;
export type HealthProbes = Record<HealthCheckName, HealthProbe>;

export type HealthCheckResult = {
  ok: boolean;
};

export type LivenessPayload = {
  ok: true;
  service: typeof HEALTH_SERVICE;
  stage: typeof HEALTH_STAGE;
  live: true;
};

export type ReadinessPayload = {
  ok: boolean;
  service: typeof HEALTH_SERVICE;
  stage: typeof HEALTH_STAGE;
  live: true;
  ready: boolean;
  checks: Record<HealthCheckName, HealthCheckResult>;
};

/**
 * Process is up. Cheap public shape for load balancers — no dependency I/O.
 * Does not mean invite / train / generate can succeed.
 */
export function livenessPayload(): LivenessPayload {
  return {
    ok: true,
    service: HEALTH_SERVICE,
    stage: HEALTH_STAGE,
    live: true,
  };
}

export function readinessStatus(payload: Pick<ReadinessPayload, "ready">): 200 | 503 {
  return payload.ready ? 200 : 503;
}

/**
 * Run injected probes and return a public readiness shape.
 * Failures collapse to `{ ok: false }` — never copy error messages, hosts, or URLs.
 */
export async function collectReadiness(
  probes: HealthProbes,
  options?: { timeoutMs?: number },
): Promise<ReadinessPayload> {
  const timeoutMs = options?.timeoutMs ?? HEALTH_PROBE_TIMEOUT_MS;
  const entries = await Promise.all(
    HEALTH_CHECK_NAMES.map(async (name) => {
      const result = await runProbe(probes[name], timeoutMs);
      return [name, result] as const;
    }),
  );
  const checks = Object.fromEntries(entries) as Record<HealthCheckName, HealthCheckResult>;
  const ready = HEALTH_CHECK_NAMES.every((name) => checks[name].ok);
  return {
    ok: ready,
    service: HEALTH_SERVICE,
    stage: HEALTH_STAGE,
    live: true,
    ready,
    checks,
  };
}

async function runProbe(probe: HealthProbe, timeoutMs: number): Promise<HealthCheckResult> {
  try {
    await withTimeout(Promise.resolve().then(probe), timeoutMs);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("health_probe_timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
    void promise.catch(() => {
      /* swallow late rejections after timeout */
    });
  });
}
