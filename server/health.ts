import type { Queue } from "bullmq";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  collectReadiness,
  livenessPayload,
  readinessStatus,
  type HealthProbes,
  type LivenessPayload,
  type ReadinessPayload,
} from "@/lib/health";
import { jobLog } from "@/lib/job-log";
import { getDb } from "@/server/db";
import { getGenerateStillQueue, getTrainPackQueue } from "@/server/queue";
import { getRateLimitRedis } from "@/server/redis";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Cheap probes for invite → train → generate. Throws on failure; messages are discarded by collectReadiness. */
export function liveHealthProbes(): HealthProbes {
  return {
    postgres: pingPostgres,
    redis: pingRedis,
    queue: pingQueue,
  };
}

export async function pingPostgres(): Promise<void> {
  await getDb().execute(sql`select 1`);
}

export async function pingRedis(): Promise<void> {
  const pong = await getRateLimitRedis().ping();
  if (String(pong).toUpperCase() !== "PONG") {
    throw new Error("redis ping failed");
  }
}

/** BullMQ connect for Train & lock and Generate (shared Redis broker). */
export async function pingQueue(): Promise<void> {
  await Promise.all([pingOneQueue(getGenerateStillQueue()), pingOneQueue(getTrainPackQueue())]);
}

async function pingOneQueue(queue: Queue): Promise<void> {
  await queue.waitUntilReady();
  await queue.getJobCounts("wait");
}

export async function getReadiness(): Promise<ReadinessPayload> {
  return collectReadiness(liveHealthProbes());
}

export function livenessResponse(): NextResponse<LivenessPayload> {
  return NextResponse.json(livenessPayload(), { headers: NO_STORE });
}

export function readinessResponse(payload: ReadinessPayload): NextResponse<ReadinessPayload> {
  return NextResponse.json(payload, {
    status: readinessStatus(payload),
    headers: NO_STORE,
  });
}

/** Worker boot: same three checks, booleans only — never log driver errors (hosts/URLs). */
export async function logWorkerReadiness(): Promise<ReadinessPayload> {
  const payload = await getReadiness();
  jobLog("workers.ready", {
    ready: payload.ready,
    postgres: payload.checks.postgres.ok,
    redis: payload.checks.redis.ok,
    queue: payload.checks.queue.ok,
  });
  return payload;
}
