import type { ConnectionOptions } from "bullmq";
import { getEnv } from "@/server/env";

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
