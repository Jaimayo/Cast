import type { ConnectionOptions } from "bullmq";
import Redis from "ioredis";
import { getEnv } from "@/server/env";

const globalForRedis = globalThis as unknown as {
  rateLimitRedis?: Redis;
};

export function redisConnection(): ConnectionOptions {
  const url = new URL(getEnv().redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
  };
}

/** Dedicated ioredis client for enqueue caps. Not shared with BullMQ (different retry settings). */
export function getRateLimitRedis(): Redis {
  globalForRedis.rateLimitRedis ??= new Redis(getEnv().redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 800,
    enableReadyCheck: true,
  });
  return globalForRedis.rateLimitRedis;
}
