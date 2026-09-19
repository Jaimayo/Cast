import { describe, expect, it } from "vitest";
import { PACK_MIN_REFS, PACK_REF_MAX_BYTES, PACK_TARGET_REFS } from "@/lib/constants";
import {
  PACK_REF_EMPTY,
  PACK_REF_EMPTY_MESSAGE,
  PACK_REF_FICTIONAL_COPY,
  PACK_REF_LIMITS_COPY,
  PACK_REF_TOO_LARGE,
  PACK_REF_TOO_LARGE_MESSAGE,
  PACK_REF_TYPE,
  PACK_REF_TYPE_MESSAGE,
  extForPackRefMime,
  packRefMeterCopy,
  sniffPackRefMime,
  validatePackRefFile,
} from "@/lib/pack-ref-upload";

function jpegBytes(size = 32): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  return bytes;
}

function pngBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
}

function webpBytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  return bytes;
}

describe("sniffPackRefMime", () => {
  it("reads JPEG PNG and WebP magic", () => {
    expect(sniffPackRefMime(jpegBytes())).toBe("image/jpeg");
    expect(sniffPackRefMime(pngBytes())).toBe("image/png");
    expect(sniffPackRefMime(webpBytes())).toBe("image/webp");
    expect(sniffPackRefMime(new Uint8Array([0, 1, 2, 3]))).toBeNull();
  });
});

describe("validatePackRefFile", () => {
  it("accepts a small JPEG under the cap", () => {
    expect(validatePackRefFile({ bytes: jpegBytes(), refCount: 0 })).toEqual({
      ok: true,
      mimeType: "image/jpeg",
      byteSize: 32,
    });
  });

  it("rejects empty, oversized, and non-image bytes", () => {
    expect(validatePackRefFile({ bytes: new Uint8Array(), refCount: 0 })).toMatchObject({
      ok: false,
      code: PACK_REF_EMPTY,
      message: PACK_REF_EMPTY_MESSAGE,
    });
    expect(
      validatePackRefFile({ bytes: jpegBytes(PACK_REF_MAX_BYTES + 1), refCount: 0 }),
    ).toMatchObject({
      ok: false,
      code: PACK_REF_TOO_LARGE,
      message: PACK_REF_TOO_LARGE_MESSAGE,
    });
    expect(validatePackRefFile({ bytes: new Uint8Array([1, 2, 3, 4]), refCount: 0 })).toMatchObject({
      ok: false,
      code: PACK_REF_TYPE,
      message: PACK_REF_TYPE_MESSAGE,
    });
  });

  it("trusts bytes over a claimed MIME type", () => {
    const png = pngBytes();
    expect(validatePackRefFile({ bytes: png, claimedMime: "image/jpeg", refCount: 3 })).toEqual({
      ok: true,
      mimeType: "image/png",
      byteSize: png.byteLength,
    });
  });

  it("refuses a 21st picture", () => {
    expect(validatePackRefFile({ bytes: jpegBytes(), refCount: PACK_TARGET_REFS })).toMatchObject({
      ok: false,
      code: "PACK_REFS_FULL",
    });
  });
});

describe("pack ref copy", () => {
  it("states count and size limits without real-face wording", () => {
    expect(PACK_REF_LIMITS_COPY).toContain(`${PACK_TARGET_REFS}`);
    expect(PACK_REF_LIMITS_COPY).toContain("8 MB");
    expect(PACK_REF_LIMITS_COPY.toLowerCase()).not.toMatch(/face/);
    expect(PACK_REF_FICTIONAL_COPY.toLowerCase()).not.toMatch(/face|real person/);
    expect(packRefMeterCopy(0)).toContain(`${PACK_MIN_REFS} min`);
    expect(packRefMeterCopy(7)).toContain("5 more to lock");
    expect(packRefMeterCopy(12)).toContain("ready to lock");
    expect(packRefMeterCopy(20)).toMatch(/full/i);
    expect(extForPackRefMime("image/jpeg")).toBe("jpg");
  });
});
