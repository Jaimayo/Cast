import { describe, expect, it } from "vitest";
import {
  hasReadySoulAdapter,
  packAlreadyHasThisAdapter,
  packColumnsForReadyAdapter,
  packUpdateForTrainFailure,
  previousAdapterSnapshot,
  publicAdapterFields,
  readAdapterIdentity,
  readyAdapterFromPersist,
  snapshotAdapterIdentity,
  trainFailTransition,
  trainStartTransition,
  trainSuccessPackStatus,
} from "@/lib/adapter-identity";

describe("adapter identity", () => {
  it("treats a legacy storage key with no status as a ready Locked Soul ID adapter", () => {
    const identity = readAdapterIdentity({
      adapterStorageKey: "adapters/u/p.lora",
      providerJobId: "rp_old",
      adapterMeta: { stub: true },
    });
    expect(identity).toMatchObject({
      adapterId: "rp_old",
      adapterPath: "adapters/u/p.lora",
      adapterStatus: "ready",
      adapterSource: "stub",
    });
    expect(hasReadySoulAdapter(identity)).toBe(true);
  });

  it("does not treat pending or failed leftovers as ready for Generate", () => {
    expect(
      hasReadySoulAdapter({
        adapterStorageKey: "adapters/u/p.lora",
        adapterStatus: "pending",
      }),
    ).toBe(false);
    expect(
      hasReadySoulAdapter({
        adapterStorageKey: "adapters/u/p.lora",
        adapterStatus: "failed",
      }),
    ).toBe(false);
    expect(
      hasReadySoulAdapter({
        adapterStorageKey: null,
        adapterStatus: "none",
      }),
    ).toBe(false);
  });

  it("writes the same ready shape for stub and live persist", () => {
    const stub = readyAdapterFromPersist({
      providerJobId: "stub-train-pack-1",
      provider: "stub",
      storageKey: "adapters/stub/pack-1.lora",
      mimeType: "application/octet-stream",
      meta: { stub: true },
    });
    const live = readyAdapterFromPersist({
      providerJobId: "rp_train_1",
      provider: "runpod",
      storageKey: "adapters/user-1/pack-1.lora",
      mimeType: "application/octet-stream",
      meta: { sourceUrl: "https://example.invalid/pack.safetensors" },
    });

    for (const ready of [stub, live]) {
      expect(ready.adapterStatus).toBe("ready");
      expect(ready.adapterId).toBeTruthy();
      expect(ready.adapterPath).toBeTruthy();
      expect(["stub", "live"]).toContain(ready.adapterSource);
      expect(ready.adapterMeta.adapterId).toBe(ready.adapterId);
      expect(ready.adapterMeta.adapterSource).toBe(ready.adapterSource);
      expect(ready.adapterMeta.providerJobId).toBe(ready.adapterId);
      expect(Object.keys(packColumnsForReadyAdapter(ready)).sort()).toEqual(
        [
          "adapterId",
          "adapterMeta",
          "adapterMimeType",
          "adapterSource",
          "adapterStatus",
          "adapterStorageKey",
        ].sort(),
      );
    }

    expect(stub.adapterSource).toBe("stub");
    expect(stub.adapterMeta.stub).toBe(true);
    expect(live.adapterSource).toBe("live");
    expect(live.adapterMeta.stub).toBe(false);
    expect(JSON.stringify(stub.adapterMeta)).not.toMatch(/prompt|stack|Bearer/i);
    expect(JSON.stringify(live.adapterMeta)).not.toMatch(/prompt|stack|Bearer/i);
  });
});

describe("train / lock adapter state machine", () => {
  const ready = readAdapterIdentity({
    adapterId: "rp_old",
    adapterStorageKey: "adapters/u/p.lora",
    adapterStatus: "ready",
    adapterSource: "live",
    providerJobId: "rp_old",
  });

  it("draft Train & lock marks adapter pending and does not keep a prior identity", () => {
    expect(
      trainStartTransition({
        retrain: false,
        identity: readAdapterIdentity({ adapterStatus: "none" }),
      }),
    ).toEqual({ packStatus: "training", adapterStatus: "pending", keepPriorAdapter: false });
  });

  it("retrain keeps the ready adapter on the pack while status is training", () => {
    expect(trainStartTransition({ retrain: true, identity: ready })).toEqual({
      packStatus: "training",
      adapterStatus: "ready",
      keepPriorAdapter: true,
    });
  });

  it("success always locks with a ready adapter", () => {
    expect(trainSuccessPackStatus()).toEqual({ packStatus: "locked", adapterStatus: "ready" });
  });

  it("first-train fail goes failed; retrain fail restores Locked + ready", () => {
    expect(trainFailTransition(false)).toEqual({
      packStatus: "failed",
      adapterStatus: "failed",
      restorePriorAdapter: false,
    });
    expect(trainFailTransition(true)).toEqual({
      packStatus: "locked",
      adapterStatus: "ready",
      restorePriorAdapter: true,
    });
  });

  it("retrain fail update restores adapter id/status/source and never writes adapterStorageKey", () => {
    const update = packUpdateForTrainFailure({
      keepLocked: true,
      previousProviderJobId: "rp_old",
      failedProviderJobId: "rp_new",
      currentProviderJobId: "rp_new",
      previousAdapter: snapshotAdapterIdentity(ready),
    });
    expect(update).toEqual({
      status: "locked",
      providerJobId: "rp_old",
      adapterStatus: "ready",
      adapterId: "rp_old",
      adapterSource: "live",
    });
    expect(update).not.toHaveProperty("adapterStorageKey");
    expect(update).not.toHaveProperty("adapterMeta");
  });

  it("first-train fail update marks adapter failed without clearing a path column", () => {
    const update = packUpdateForTrainFailure({
      keepLocked: false,
      previousProviderJobId: null,
      failedProviderJobId: "rp_new",
    });
    expect(update).toEqual({
      status: "failed",
      providerJobId: "rp_new",
      adapterStatus: "failed",
    });
    expect(update).not.toHaveProperty("adapterStorageKey");
  });

  it("job snapshots omit the storage path so Jobs JSON cannot leak it", () => {
    const snap = snapshotAdapterIdentity(ready);
    expect(snap).toEqual({
      adapterId: "rp_old",
      adapterStatus: "ready",
      adapterSource: "live",
    });
    expect(snap).not.toHaveProperty("adapterPath");
    expect(
      previousAdapterSnapshot({
        retrain: true,
        previousAdapter: snap,
      }),
    ).toEqual(snap);
  });

  it("skips a train job that already persisted this adapter on a Locked pack", () => {
    expect(
      packAlreadyHasThisAdapter(
        {
          status: "locked",
          adapterId: "rp_1",
          adapterStorageKey: "adapters/u/p.lora",
          adapterStatus: "ready",
          providerJobId: "rp_1",
        },
        "rp_1",
      ),
    ).toBe(true);
    expect(
      packAlreadyHasThisAdapter(
        {
          status: "training",
          adapterId: "rp_1",
          adapterStorageKey: "adapters/u/p.lora",
          adapterStatus: "ready",
          providerJobId: "rp_inflight",
        },
        "rp_inflight",
      ),
    ).toBe(false);
  });

  it("public pack fields expose status/source, not path or id", () => {
    const pub = publicAdapterFields(ready);
    expect(pub).toEqual({
      hasAdapter: true,
      adapterStatus: "ready",
      adapterSource: "live",
    });
    expect(JSON.stringify(pub)).not.toMatch(/adapters\/|rp_old|\.lora/i);
  });
});
