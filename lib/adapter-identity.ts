/**
 * Locked Soul ID adapter identity.
 *
 * Train & lock (stub or live RunPod) persists the same fields on the
 * Character Pack so later generateStill can find the adapter:
 *   adapterId     — provider job id of the stored adapter
 *   adapterPath   — object-storage key (DB column adapter_storage_key)
 *   adapterStatus — none | pending | ready | failed
 *   adapterSource — stub | live
 *
 * Retrain must not clobber a ready identity until the new train succeeds.
 * Generate is Locked Soul ID + Pose: ready adapter → RunPod identity stills;
 * no adapter → Venice default.
 */

export const ADAPTER_STATUSES = ["none", "pending", "ready", "failed"] as const;
export type AdapterStatus = (typeof ADAPTER_STATUSES)[number];

export const ADAPTER_SOURCES = ["stub", "live"] as const;
export type AdapterSource = (typeof ADAPTER_SOURCES)[number];

export type AdapterIdentity = {
  adapterId: string | null;
  adapterPath: string | null;
  adapterStatus: AdapterStatus;
  adapterSource: AdapterSource | null;
  adapterMimeType: string | null;
};

/** Job inputJson snapshot — no storage path (Jobs API must not leak keys). */
export type AdapterIdentitySnapshot = {
  adapterId: string | null;
  adapterStatus: AdapterStatus;
  adapterSource: AdapterSource | null;
};

export type PackAdapterRow = {
  adapterId?: string | null;
  adapterStorageKey?: string | null;
  adapterStatus?: string | null;
  adapterSource?: string | null;
  adapterMimeType?: string | null;
  adapterMeta?: Record<string, unknown> | null;
  providerJobId?: string | null;
};

export function adapterSourceFromProvider(provider: string): AdapterSource {
  return provider === "stub" ? "stub" : "live";
}

export function parseAdapterStatus(value: unknown): AdapterStatus {
  if (value === "pending" || value === "ready" || value === "failed" || value === "none") {
    return value;
  }
  return "none";
}

export function parseAdapterSource(value: unknown): AdapterSource | null {
  if (value === "stub" || value === "live") return value;
  return null;
}

function trimmed(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sourceFromMeta(meta: Record<string, unknown> | null | undefined): AdapterSource | null {
  if (!meta) return null;
  const explicit = parseAdapterSource(meta.adapterSource);
  if (explicit) return explicit;
  if (meta.stub === true) return "stub";
  const provider = trimmed(meta.provider);
  if (provider) return adapterSourceFromProvider(provider);
  return null;
}

/**
 * Read the canonical identity off a pack row.
 * Legacy rows with a storage key but no adapter_status are treated as ready
 * so Generate still finds the adapter after migrate backfill.
 */
export function readAdapterIdentity(pack: PackAdapterRow): AdapterIdentity {
  const adapterPath = trimmed(pack.adapterStorageKey);
  const storedStatus = parseAdapterStatus(pack.adapterStatus);
  const adapterStatus = storedStatus === "none" && adapterPath ? "ready" : storedStatus;
  const adapterId = trimmed(pack.adapterId) ?? (adapterPath ? trimmed(pack.providerJobId) : null);
  const adapterSource =
    parseAdapterSource(pack.adapterSource) ?? sourceFromMeta(pack.adapterMeta) ?? (adapterPath ? "live" : null);

  return {
    adapterId,
    adapterPath,
    adapterStatus,
    adapterSource,
    adapterMimeType: trimmed(pack.adapterMimeType),
  };
}

export function hasReadySoulAdapter(pack: PackAdapterRow | AdapterIdentity): boolean {
  const row: PackAdapterRow =
    "adapterStorageKey" in pack || !("adapterPath" in pack)
      ? (pack as PackAdapterRow)
      : {
          adapterId: pack.adapterId,
          adapterStorageKey: pack.adapterPath,
          adapterStatus: pack.adapterStatus,
          adapterSource: pack.adapterSource,
          adapterMimeType: pack.adapterMimeType,
        };
  const identity = readAdapterIdentity(row);
  return identity.adapterStatus === "ready" && Boolean(identity.adapterPath);
}

export function snapshotAdapterIdentity(identity: AdapterIdentity): AdapterIdentitySnapshot {
  return {
    adapterId: identity.adapterId,
    adapterStatus: identity.adapterStatus,
    adapterSource: identity.adapterSource,
  };
}

export function previousAdapterSnapshot(
  inputJson: Record<string, unknown> | null | undefined,
): AdapterIdentitySnapshot | null {
  const value = inputJson?.previousAdapter;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  return {
    adapterId: trimmed(rec.adapterId),
    adapterStatus: parseAdapterStatus(rec.adapterStatus),
    adapterSource: parseAdapterSource(rec.adapterSource),
  };
}

export function trainStartTransition(input: {
  retrain: boolean;
  identity: AdapterIdentity;
}): {
  packStatus: "training";
  adapterStatus: AdapterStatus;
  keepPriorAdapter: boolean;
} {
  const keepPriorAdapter = input.retrain && hasReadySoulAdapter(input.identity);
  return {
    packStatus: "training",
    adapterStatus: keepPriorAdapter ? "ready" : "pending",
    keepPriorAdapter,
  };
}

export function trainSuccessPackStatus(): { packStatus: "locked"; adapterStatus: "ready" } {
  return { packStatus: "locked", adapterStatus: "ready" };
}

export function trainFailTransition(keepLocked: boolean): {
  packStatus: "locked" | "failed";
  adapterStatus: "ready" | "failed";
  restorePriorAdapter: boolean;
} {
  if (keepLocked) {
    return { packStatus: "locked", adapterStatus: "ready", restorePriorAdapter: true };
  }
  return { packStatus: "failed", adapterStatus: "failed", restorePriorAdapter: false };
}

/** Idempotent skip: this train already persisted a ready adapter on a Locked pack. */
export function packAlreadyHasThisAdapter(
  pack: PackAdapterRow & { status?: string | null },
  providerJobId?: string | null,
): boolean {
  if (pack.status !== "locked" && pack.status !== "ready") return false;
  if (!hasReadySoulAdapter(pack)) return false;
  const id = trimmed(providerJobId);
  if (!id) return false;
  const identity = readAdapterIdentity(pack);
  return identity.adapterId === id || trimmed(pack.providerJobId) === id;
}

export function readyAdapterFromPersist(input: {
  providerJobId: string;
  provider: string;
  storageKey: string;
  mimeType: string;
  meta: Record<string, unknown>;
}): {
  adapterId: string;
  adapterPath: string;
  adapterStatus: "ready";
  adapterSource: AdapterSource;
  adapterMimeType: string;
  adapterMeta: Record<string, unknown>;
} {
  const adapterSource = adapterSourceFromProvider(input.provider);
  const adapterId = input.providerJobId;
  return {
    adapterId,
    adapterPath: input.storageKey,
    adapterStatus: "ready",
    adapterSource,
    adapterMimeType: input.mimeType,
    adapterMeta: {
      ...input.meta,
      provider: input.provider,
      providerJobId: adapterId,
      adapterId,
      adapterSource,
      stub: adapterSource === "stub",
    },
  };
}

export function packColumnsForReadyAdapter(ready: ReturnType<typeof readyAdapterFromPersist>): {
  adapterId: string;
  adapterStorageKey: string;
  adapterMimeType: string;
  adapterStatus: "ready";
  adapterSource: AdapterSource;
  adapterMeta: Record<string, unknown>;
} {
  return {
    adapterId: ready.adapterId,
    adapterStorageKey: ready.adapterPath,
    adapterMimeType: ready.adapterMimeType,
    adapterStatus: ready.adapterStatus,
    adapterSource: ready.adapterSource,
    adapterMeta: ready.adapterMeta,
  };
}

export type TrainFailPackUpdate = {
  status: "locked" | "failed";
  providerJobId: string | null;
  adapterStatus: AdapterStatus;
  adapterId?: string | null;
  adapterSource?: AdapterSource | null;
};

/**
 * Failure update. Never includes adapterStorageKey — a retrain fail must
 * leave the prior LoRA path on the pack so Generate still finds it.
 */
export function packUpdateForTrainFailure(input: {
  keepLocked: boolean;
  previousProviderJobId: string | null;
  failedProviderJobId?: string | null;
  currentProviderJobId?: string | null;
  previousAdapter?: AdapterIdentitySnapshot | null;
}): TrainFailPackUpdate {
  const fail = trainFailTransition(input.keepLocked);
  if (fail.restorePriorAdapter) {
    const previousId = input.previousAdapter?.adapterId ?? input.previousProviderJobId;
    return {
      status: "locked",
      providerJobId: input.previousProviderJobId,
      adapterStatus: "ready",
      ...(previousId ? { adapterId: previousId } : {}),
      ...(input.previousAdapter?.adapterSource
        ? { adapterSource: input.previousAdapter.adapterSource }
        : {}),
    };
  }
  return {
    status: "failed",
    providerJobId: input.failedProviderJobId ?? input.currentProviderJobId ?? null,
    adapterStatus: "failed",
  };
}

export function publicAdapterFields(identity: AdapterIdentity): {
  hasAdapter: boolean;
  adapterStatus: AdapterStatus;
  adapterSource: AdapterSource | null;
} {
  return {
    hasAdapter: hasReadySoulAdapter(identity),
    adapterStatus: identity.adapterStatus,
    adapterSource: identity.adapterSource,
  };
}
