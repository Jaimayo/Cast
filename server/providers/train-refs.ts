import { TRAIN_REF_PRESIGN_TTL_SECONDS } from "@/lib/constants";
import { assertSafeStorageKey } from "@/server/storage";

export { TRAIN_REF_PRESIGN_TTL_SECONDS };

export function clampTrainRefPresignTtlSeconds(requested?: number): number {
  if (requested === undefined || !Number.isFinite(requested) || requested <= 0) {
    return TRAIN_REF_PRESIGN_TTL_SECONDS;
  }
  return Math.min(Math.floor(requested), TRAIN_REF_PRESIGN_TTL_SECONDS);
}

export type TrainReferencePlan = {
  referenceKeys: string[];
  referenceUrls?: string[];
};

/**
 * Live RunPod workers cannot read Cast object keys unless they share the bucket.
 * When R2 is configured, attach time-limited GET URLs (server-to-server only).
 * Stub and local disk keep keys only.
 */
export async function planTrainReferences(input: {
  referenceKeys: string[];
  live: boolean;
  s3Configured: boolean;
  presign: (key: string, ttlSeconds: number) => Promise<string>;
}): Promise<TrainReferencePlan> {
  const referenceKeys = input.referenceKeys.map((key) => assertSafeStorageKey(key));
  if (!input.live || !input.s3Configured || referenceKeys.length === 0) {
    return { referenceKeys };
  }

  const ttl = clampTrainRefPresignTtlSeconds();
  const referenceUrls = await Promise.all(referenceKeys.map((key) => input.presign(key, ttl)));
  return { referenceKeys, referenceUrls };
}
