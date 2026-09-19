import { stillAspectFromUnknown, type StillAspectId } from "@/lib/still-aspect";

/** Browser session/stub memory for Composer chips + Frame. Not a server secret. */
export const COMPOSER_DRAFT_STORAGE_KEY = "cast_composer_draft";

export type ComposerDraft = {
  characterPackId?: string;
  poseChipId?: string;
  outfitChipId?: string;
  sceneChipId?: string;
  lightingChipId?: string;
  bodyChipId?: string;
  aspectRatio: StillAspectId;
};

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function parseComposerDraft(raw: unknown): ComposerDraft | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  return {
    characterPackId: asOptionalString(row.characterPackId),
    poseChipId: asOptionalString(row.poseChipId),
    outfitChipId: asOptionalString(row.outfitChipId),
    sceneChipId: asOptionalString(row.sceneChipId),
    lightingChipId: asOptionalString(row.lightingChipId),
    bodyChipId: asOptionalString(row.bodyChipId),
    aspectRatio: stillAspectFromUnknown(row.aspectRatio),
  };
}

export function readComposerDraft(storage: Pick<Storage, "getItem"> | null | undefined): ComposerDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(COMPOSER_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return parseComposerDraft(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeComposerDraft(
  storage: Pick<Storage, "setItem"> | null | undefined,
  draft: ComposerDraft,
): void {
  if (!storage) return;
  try {
    storage.setItem(COMPOSER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* Private mode / quota — keep generating with in-memory state. */
  }
}

export function pickKnownChipId(id: string | undefined, chips: Array<{ id: string }>, fallback = ""): string {
  if (id && chips.some((chip) => chip.id === id)) {
    return id;
  }
  return fallback;
}
