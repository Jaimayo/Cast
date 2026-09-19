import { demoCopyIsFictionalOnly } from "@/lib/demo-pack";
import { DEFAULT_STILL_ASPECT_ID, getStillAspect, stillAspectFromUnknown } from "@/lib/still-aspect";

/** Library empty + detail copy. Fictional-only. Do not invent faces. */
export const LIBRARY_KICKER = "Library";
export const LIBRARY_TITLE = "Your stills";
export const LIBRARY_PRIVATE_COPY = "Private in-app stills. Nothing is public.";
export const LIBRARY_EMPTY_TITLE = "Nothing stored yet";
export const LIBRARY_EMPTY_BODY =
  "Generate a fictional still in Create. It lands here — private, in-app, champagne on void. Not a public gallery.";
export const LIBRARY_EMPTY_ACTION = "Open Create";
export const LIBRARY_EMPTY_HREF = "/app/create";
export const LIBRARY_DETAIL_KICKER = "Still";
export const LIBRARY_DETAIL_EMPTY_TITLE = "Select a still";
export const LIBRARY_DETAIL_EMPTY_BODY =
  "Open a tile to see the 3:4 still, Character Pack, and Frame. Champagne placeholders until fictional Soul ID refs land.";
export const LIBRARY_PLACEHOLDER_NOTE = "Champagne placeholder — not a face.";
export const LIBRARY_DOWNLOAD_LABEL = "Download";
export const LIBRARY_SHARE_LABEL = "Share";
export const LIBRARY_DOWNLOAD_DISABLED_REASON = "Stage 1 keeps stills in-app. Download later.";
export const LIBRARY_SHARE_DISABLED_REASON = "Private. Nothing is public.";
export const LIBRARY_USE_IN_PACK_LABEL = "Use on a Character Pack";
export const LIBRARY_USE_IN_PACK_HREF = "/app/characters";
export const LIBRARY_CLOSE_LABEL = "Close";
export const LIBRARY_PREV_LABEL = "Previous still";
export const LIBRARY_NEXT_LABEL = "Next still";
export const LIBRARY_DEMO_ALT = "Fictional placeholder still";
export const LIBRARY_OWN_ALT = "Your still";

export type LibraryStillInput = {
  id: string;
  previewUrl: string;
  label?: string | null;
  packName?: string | null;
  demo?: boolean;
  kind?: string | null;
  createdAt?: Date | string | null;
  aspectRatio?: string | null;
};

export function toLibraryStillInput(row: {
  id: string;
  previewUrl: string;
  label?: string | null;
  packName?: string | null;
  demo?: boolean;
  kind?: string | null;
  createdAt?: Date | string | null;
  aspectRatio?: string | null;
}): LibraryStillInput {
  let createdAt: string | null = null;
  if (row.createdAt) {
    const date = new Date(row.createdAt);
    createdAt = Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return {
    id: row.id,
    previewUrl: row.previewUrl,
    label: row.label ?? null,
    packName: row.packName ?? null,
    demo: Boolean(row.demo),
    kind: row.kind ?? "still",
    createdAt,
    aspectRatio: row.aspectRatio ?? null,
  };
}

export type LibraryStillView = {
  id: string;
  previewUrl: string;
  title: string;
  packName: string | null;
  packLine: string;
  aspectId: string;
  aspectLabel: string;
  demo: boolean;
  alt: string;
  badge: string | null;
  privacy: string;
  placeholderNote: string | null;
  tileCaption: string;
  createdLabel: string | null;
  kindLabel: string;
};

export type LibraryAffordance = {
  label: string;
  enabled: false;
  reason: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function libraryStillCreatedLabel(createdAt: Date | string | null | undefined): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function libraryStillPresentation(still: LibraryStillInput): LibraryStillView {
  const demo = Boolean(still.demo);
  const label = still.label?.trim() || null;
  const packName = still.packName?.trim() || null;
  const aspect = stillAspectFromUnknown(still.aspectRatio ?? DEFAULT_STILL_ASPECT_ID);
  const title = label ?? (demo ? "Demo still" : "Still");
  return {
    id: still.id,
    previewUrl: still.previewUrl,
    title,
    packName,
    packLine: packName ? `${packName} · Character Pack` : "Your still",
    aspectId: aspect,
    aspectLabel: getStillAspect(aspect).label,
    demo,
    alt: demo ? LIBRARY_DEMO_ALT : LIBRARY_OWN_ALT,
    badge: demo ? "Demo · fictional" : null,
    privacy: LIBRARY_PRIVATE_COPY,
    placeholderNote: demo ? LIBRARY_PLACEHOLDER_NOTE : null,
    tileCaption: [packName, label].filter(Boolean).join(" · ") || title,
    createdLabel: libraryStillCreatedLabel(still.createdAt),
    kindLabel: still.kind === "still" || !still.kind ? "Still" : still.kind,
  };
}

export function libraryDownloadAffordance(): LibraryAffordance {
  return {
    label: LIBRARY_DOWNLOAD_LABEL,
    enabled: false,
    reason: LIBRARY_DOWNLOAD_DISABLED_REASON,
  };
}

export function libraryShareAffordance(): LibraryAffordance {
  return {
    label: LIBRARY_SHARE_LABEL,
    enabled: false,
    reason: LIBRARY_SHARE_DISABLED_REASON,
  };
}

/** Stay on the same still at the ends — Library is a sheet, not a carousel. */
export function adjacentLibraryStillId(ids: string[], current: string | null, delta: -1 | 1): string | null {
  if (!ids.length) return null;
  if (!current) return ids[0] ?? null;
  const index = ids.indexOf(current);
  if (index < 0) return ids[0] ?? null;
  const next = index + delta;
  if (next < 0 || next >= ids.length) return ids[index]!;
  return ids[next]!;
}

export function libraryCopyIsFictionalOnly(): boolean {
  return [LIBRARY_EMPTY_BODY, LIBRARY_DETAIL_EMPTY_BODY, LIBRARY_PLACEHOLDER_NOTE, LIBRARY_DEMO_ALT].every(
    (text) => demoCopyIsFictionalOnly(text) || /placeholder|not a face/i.test(text),
  );
}
