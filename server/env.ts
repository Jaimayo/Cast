import { loadLocalEnv } from "@/lib/load-env";
import { roleForEmail } from "@/lib/auth-guards";
import { stubSessionSecret } from "@/lib/memory-preview";

loadLocalEnv();

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export type ProviderMode = "stub" | "live";

export function getEnv() {
  const providerMode = (read("PROVIDER_MODE") ?? "stub") as ProviderMode;
  if (providerMode !== "stub" && providerMode !== "live") {
    throw new Error("PROVIDER_MODE must be stub or live");
  }

  const sessionSecret = stubSessionSecret(providerMode, read("SESSION_SECRET"));
  if (!sessionSecret) {
    throw new Error("Missing required environment variable SESSION_SECRET");
  }

  const databaseUrl = read("DATABASE_URL");
  if (providerMode === "live" && !databaseUrl) {
    throw new Error("Missing required environment variable DATABASE_URL");
  }

  return {
    nodeEnv: read("NODE_ENV") ?? "development",
    appBaseUrl: read("APP_BASE_URL") ?? "http://localhost:3000",
    sessionSecret,
    adminEmails: (read("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
    databaseUrl,
    redisUrl: read("REDIS_URL") ?? "redis://localhost:6379",
    providerMode,
    generateStillProvider: read("GENERATE_STILL_PROVIDER") ?? "venice",
    trainPackProvider: read("TRAIN_PACK_PROVIDER") ?? "runpod",
    venice: {
      apiKey: read("VENICE_API_KEY"),
      baseUrl: read("VENICE_API_BASE_URL") ?? "https://api.venice.ai/api/v1",
      imageModel: read("VENICE_IMAGE_MODEL") ?? "lustify-v8",
      safeMode: (read("VENICE_SAFE_MODE") ?? "false") === "true",
    },
    runpod: {
      apiKey: read("RUNPOD_API_KEY"),
      baseUrl: read("RUNPOD_API_BASE_URL") ?? "https://api.runpod.ai/v2",
      trainEndpointId: read("RUNPOD_TRAIN_ENDPOINT_ID"),
      generateEndpointId: read("RUNPOD_GENERATE_ENDPOINT_ID"),
    },
    sister: {
      apiKey: read("SISTER_API_KEY"),
      baseUrl: read("SISTER_API_BASE_URL"),
    },
    s3: {
      endpoint: read("S3_ENDPOINT"),
      region: read("S3_REGION") ?? "auto",
      bucket: read("S3_BUCKET") ?? "cast-media",
      accessKeyId: read("S3_ACCESS_KEY_ID"),
      secretAccessKey: read("S3_SECRET_ACCESS_KEY"),
      forcePathStyle: (read("S3_FORCE_PATH_STYLE") ?? "true") === "true",
    },
  };
}

export function isAdminEmail(email: string): boolean {
  return roleForEmail(email, getEnv().adminEmails) === "admin";
}
