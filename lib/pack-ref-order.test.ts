import { describe, expect, it } from "vitest";
import { moveRefId, PACK_REF_ORDER_DUP, PACK_REF_ORDER_MISMATCH, reorderRefsDecision } from "@/lib/pack-ref-order";

describe("reorderRefsDecision", () => {
  it("accepts a permutation of the current ids", () => {
    expect(reorderRefsDecision(["a", "b", "c"], ["c", "a", "b"])).toEqual({
      ok: true,
      order: ["c", "a", "b"],
    });
  });

  it("rejects extras, missing ids, and duplicates", () => {
    expect(reorderRefsDecision(["a", "b"], ["a"])).toMatchObject({
      ok: false,
      message: PACK_REF_ORDER_MISMATCH,
    });
    expect(reorderRefsDecision(["a", "b"], ["a", "z"])).toMatchObject({
      ok: false,
      message: PACK_REF_ORDER_MISMATCH,
    });
    expect(reorderRefsDecision(["a", "b"], ["a", "a"])).toMatchObject({
      ok: false,
      message: PACK_REF_ORDER_DUP,
    });
  });
});

describe("moveRefId", () => {
  it("moves a picture left or right and no-ops at the edges", () => {
    expect(moveRefId(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveRefId(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
    expect(moveRefId(["a", "b", "c"], "a", -1)).toEqual(["a", "b", "c"]);
    expect(moveRefId(["a", "b", "c"], "missing", 1)).toEqual(["a", "b", "c"]);
  });
});
