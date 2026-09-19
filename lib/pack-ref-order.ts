export type ReorderRefsDecision = { ok: true; order: string[] } | { ok: false; message: string };

export const PACK_REF_ORDER_MISMATCH = "Reference list does not match this pack.";
export const PACK_REF_ORDER_DUP = "Reference order has a duplicate picture.";

/** Persist a new tray order. `next` must be the same IDs as `current`, no extras. */
export function reorderRefsDecision(current: string[], next: string[]): ReorderRefsDecision {
  if (current.length !== next.length) {
    return { ok: false, message: PACK_REF_ORDER_MISMATCH };
  }
  if (new Set(next).size !== next.length) {
    return { ok: false, message: PACK_REF_ORDER_DUP };
  }
  const have = new Set(current);
  for (const id of next) {
    if (!have.has(id)) {
      return { ok: false, message: PACK_REF_ORDER_MISMATCH };
    }
  }
  return { ok: true, order: next };
}

export function moveRefId(ids: string[], mediaAssetId: string, delta: -1 | 1): string[] {
  const index = ids.indexOf(mediaAssetId);
  if (index < 0) return ids;
  const next = index + delta;
  if (next < 0 || next >= ids.length) return ids;
  const copy = ids.slice();
  const [item] = copy.splice(index, 1);
  if (!item) return ids;
  copy.splice(next, 0, item);
  return copy;
}
