import { describe, expect, it } from "vitest";
import {
  collectReadiness,
  livenessPayload,
  readinessStatus,
  type HealthProbes,
  type ReadinessPayload,
} from "@/lib/health";

const LEAK_RE =
  /postgres:\/\/|redis:\/\/|rediss:\/\/|DATABASE_URL|REDIS_URL|s3cret|cast:cast|db\.internal|redis\.prod|10\.1\.2\.3|:5432|:6379|ECONNREFUSED|ENOTFOUND|getaddrinfo|NOAUTH|password=/i;

function okProbes(overrides: Partial<HealthProbes> = {}): HealthProbes {
  return {
    postgres: async () => undefined,
    redis: async () => undefined,
    queue: async () => undefined,
    ...overrides,
  };
}

function expectNoLeak(payload: unknown) {
  const raw = JSON.stringify(payload);
  expect(raw).not.toMatch(LEAK_RE);
  expect(raw).not.toMatch(/error|message|reason|host|stack|cause/i);
}

describe("livenessPayload", () => {
  it("is a public process-up shape with no dependency checks", () => {
    const payload = livenessPayload();
    expect(payload).toEqual({
      ok: true,
      service: "cast",
      stage: 1,
      live: true,
    });
    expect(payload).not.toHaveProperty("ready");
    expect(payload).not.toHaveProperty("checks");
    expectNoLeak(payload);
  });
});

describe("collectReadiness", () => {
  it("is ready when postgres, redis, and queue probes succeed", async () => {
    const payload = await collectReadiness(okProbes());
    expect(payload).toEqual({
      ok: true,
      service: "cast",
      stage: 1,
      live: true,
      ready: true,
      checks: {
        postgres: { ok: true },
        redis: { ok: true },
        queue: { ok: true },
      },
    });
    expect(readinessStatus(payload)).toBe(200);
    expectNoLeak(payload);
  });

  it("is not ready when postgres fails, without leaking the connection string", async () => {
    const payload = await collectReadiness(
      okProbes({
        postgres: async () => {
          throw new Error(
            "connect ECONNREFUSED 10.1.2.3:5432 postgres://cast:s3cret@db.internal:5432/cast DATABASE_URL=postgres://cast:cast@localhost:5432/cast",
          );
        },
      }),
    );
    expectFailureShape(payload, "postgres");
    expect(JSON.stringify(payload)).not.toContain("s3cret");
    expect(JSON.stringify(payload)).not.toContain("db.internal");
  });

  it("is not ready when redis fails, without leaking hostnames", async () => {
    const payload = await collectReadiness(
      okProbes({
        redis: async () => {
          throw new Error("getaddrinfo ENOTFOUND redis.prod.internal REDIS_URL=rediss://:p@host:6379");
        },
      }),
    );
    expectFailureShape(payload, "redis");
  });

  it("is not ready when the BullMQ queue probe fails, without leaking auth errors", async () => {
    const payload = await collectReadiness(
      okProbes({
        queue: async () => {
          throw new Error("NOAUTH Authentication required password=s3cret redis://:s3cret@10.1.2.3:6379");
        },
      }),
    );
    expectFailureShape(payload, "queue");
  });

  it("treats a hung probe as failed without leaking", async () => {
    const payload = await collectReadiness(
      okProbes({
        postgres: () => new Promise(() => undefined),
      }),
      { timeoutMs: 25 },
    );
    expectFailureShape(payload, "postgres");
  });

  it("is not ready if any probe throws, even when others succeed", async () => {
    const payload = await collectReadiness(
      okProbes({
        postgres: async () => {
          throw new Error("ECONNREFUSED 10.1.2.3:5432");
        },
        queue: async () => {
          throw new Error("NOAUTH");
        },
      }),
    );
    expect(payload.ok).toBe(false);
    expect(payload.ready).toBe(false);
    expect(payload.live).toBe(true);
    expect(payload.checks).toEqual({
      postgres: { ok: false },
      redis: { ok: true },
      queue: { ok: false },
    });
    expect(readinessStatus(payload)).toBe(503);
    expectNoLeak(payload);
  });

  it("maps a probe that throws a non-Error value to { ok: false }", async () => {
    const payload = await collectReadiness(
      okProbes({
        redis: async () => {
          throw "redis://:s3cret@db.internal:6379";
        },
      }),
    );
    expectFailureShape(payload, "redis");
  });
});

function expectFailureShape(payload: ReadinessPayload, failed: keyof ReadinessPayload["checks"]) {
  expect(payload.ok).toBe(false);
  expect(payload.ready).toBe(false);
  expect(payload.live).toBe(true);
  expect(payload.service).toBe("cast");
  expect(payload.stage).toBe(1);
  expect(payload.checks[failed]).toEqual({ ok: false });
  expect(readinessStatus(payload)).toBe(503);
  expect(payload.checks[failed]).not.toHaveProperty("error");
  expect(payload.checks[failed]).not.toHaveProperty("message");
  expectNoLeak(payload);
}
