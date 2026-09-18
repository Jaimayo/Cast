import {
  adapterSourceFromProvider,
  packColumnsForReadyAdapter,
  readyAdapterFromPersist,
  type AdapterSource,
} from "@/lib/adapter-identity";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import { publicAdapterMeta } from "@/server/providers/train-status";
import { mediaKey, putObject } from "@/server/storage";
import type { TrainPackResult } from "@/server/providers/types";

export type AdapterPersistInput = {
  packUserId: string;
  packId: string;
  providerJobId: string;
  result: Pick<
    TrainPackResult,
    "provider" | "adapterStorageKey" | "adapterMimeType" | "adapterBytesBase64" | "adapterMeta"
  >;
};

export type AdapterPersistPlan =
  | {
      action: "write-bytes";
      storageKey: string;
      mimeType: string;
      body: Buffer;
      meta: Record<string, unknown>;
    }
  | {
      action: "fetch-url";
      storageKey: string;
      mimeType: string;
      sourceUrl: string;
      meta: Record<string, unknown>;
    }
  | {
      action: "keep-external-key";
      storageKey: string;
      mimeType: string;
      meta: Record<string, unknown>;
    }
  | {
      action: "fail";
      errorCode: typeof JOB_ERROR_CODES.TRAIN_NO_ADAPTER;
      message: string;
    };

function sourceUrlFrom(result: AdapterPersistInput["result"]): string | null {
  const value = result.adapterMeta?.sourceUrl;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function persistMeta(
  input: AdapterPersistInput,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const adapterSource = adapterSourceFromProvider(input.result.provider);
  return publicAdapterMeta({
    ...(input.result.adapterMeta ?? {}),
    ...extra,
    provider: input.result.provider,
    providerJobId: input.providerJobId,
    adapterId: input.providerJobId,
    adapterSource,
    stub: adapterSource === "stub",
  });
}

function defaultMime(result: AdapterPersistInput["result"]): string {
  return result.adapterMimeType ?? "application/octet-stream";
}

function ownedAdapterKey(input: AdapterPersistInput, ext: string): string {
  return mediaKey({
    kind: "adapters",
    userId: input.packUserId,
    id: input.packId,
    ext,
  });
}

/** Decide how to persist a stub or live-shaped trainPack adapter pointer. */
export function planAdapterPersist(input: AdapterPersistInput): AdapterPersistPlan {
  const mimeType = defaultMime(input.result);
  const meta = persistMeta(input);

  if (input.result.adapterBytesBase64) {
    return {
      action: "write-bytes",
      storageKey: ownedAdapterKey(input, "lora"),
      mimeType,
      body: Buffer.from(input.result.adapterBytesBase64, "base64"),
      meta,
    };
  }

  if (input.result.provider === "stub") {
    return {
      action: "write-bytes",
      storageKey: input.result.adapterStorageKey ?? ownedAdapterKey(input, "lora"),
      mimeType,
      body: Buffer.from("stub-lora-adapter"),
      meta: persistMeta(input, { stub: true }),
    };
  }

  if (input.result.adapterStorageKey?.trim()) {
    return {
      action: "keep-external-key",
      storageKey: input.result.adapterStorageKey.trim(),
      mimeType,
      meta,
    };
  }

  const sourceUrl = sourceUrlFrom(input.result);
  if (sourceUrl) {
    return {
      action: "fetch-url",
      storageKey: ownedAdapterKey(input, "lora"),
      mimeType,
      sourceUrl,
      meta: persistMeta(input, { sourceUrl }),
    };
  }

  return {
    action: "fail",
    errorCode: JOB_ERROR_CODES.TRAIN_NO_ADAPTER,
    message: "Train pack finished without a LoRA / adapter pointer",
  };
}

export async function fetchAdapterArtifact(
  sourceUrl: string,
): Promise<{ body: Buffer; mimeType: string | null }> {
  let response: Response;
  try {
    response = await fetch(sourceUrl);
  } catch {
    throw new JobError({
      code: JOB_ERROR_CODES.TRAIN_ADAPTER_FETCH_FAILED,
      retryable: true,
    });
  }
  if (!response.ok) {
    throw new JobError({
      code: JOB_ERROR_CODES.TRAIN_ADAPTER_FETCH_FAILED,
      retryable: true,
    });
  }
  const body = Buffer.from(await response.arrayBuffer());
  const header = response.headers.get("content-type");
  const mimeType = header ? header.split(";")[0]?.trim() || null : null;
  return { body, mimeType };
}

export type PersistedAdapterArtifact = {
  storageKey: string;
  mimeType: string;
  meta: Record<string, unknown>;
  adapterId: string;
  adapterPath: string;
  adapterStatus: "ready";
  adapterSource: AdapterSource;
};

function toPersistedArtifact(
  input: AdapterPersistInput,
  storageKey: string,
  mimeType: string,
  meta: Record<string, unknown>,
): PersistedAdapterArtifact {
  const ready = readyAdapterFromPersist({
    providerJobId: input.providerJobId,
    provider: input.result.provider,
    storageKey,
    mimeType,
    meta,
  });
  const columns = packColumnsForReadyAdapter(ready);
  return {
    storageKey: columns.adapterStorageKey,
    mimeType: columns.adapterMimeType,
    meta: columns.adapterMeta,
    adapterId: columns.adapterId,
    adapterPath: columns.adapterStorageKey,
    adapterStatus: columns.adapterStatus,
    adapterSource: columns.adapterSource,
  };
}

export async function persistAdapterPointer(input: AdapterPersistInput): Promise<PersistedAdapterArtifact> {
  const plan = planAdapterPersist(input);
  if (plan.action === "fail") {
    throw new JobError({ code: plan.errorCode, retryable: false });
  }
  if (plan.action === "keep-external-key") {
    return toPersistedArtifact(input, plan.storageKey, plan.mimeType, plan.meta);
  }

  let body: Buffer;
  let mimeType = plan.mimeType;
  if (plan.action === "write-bytes") {
    body = plan.body;
  } else {
    const fetched = await fetchAdapterArtifact(plan.sourceUrl);
    body = fetched.body;
    mimeType = fetched.mimeType || plan.mimeType;
  }

  await putObject({ key: plan.storageKey, body, mimeType });
  return toPersistedArtifact(input, plan.storageKey, mimeType, plan.meta);
}
