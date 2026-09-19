export const DEMO_LOCKED_PACK_NAME = "Mara (demo)";
export const DEMO_DRAFT_PACK_NAME = "Iris (draft)";
export const DEMO_LOCKED_REF_COUNT = 12;
export const DEMO_DRAFT_REF_COUNT = 3;

export function stubDemoLockMessage(providerMode: string): string | null {
  if (providerMode !== "stub") {
    return "Demo Locked pack is only available when PROVIDER_MODE=stub.";
  }
  return null;
}
