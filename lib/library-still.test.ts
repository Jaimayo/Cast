import { describe, expect, it } from "vitest";
import { AGE_ATTEST_COPY } from "@/lib/age-attest";
import { DEMO_LIBRARY_COPY, DEMO_PACK_IDS, demoCopyIsFictionalOnly, demoLibraryStills } from "@/lib/demo-pack";
import { placeholderHasFaceGeometry, demoPlaceholderSvg } from "@/lib/demo-placeholder";
import {
  LIBRARY_DEMO_ALT,
  LIBRARY_DETAIL_EMPTY_BODY,
  LIBRARY_DOWNLOAD_DISABLED_REASON,
  LIBRARY_DOWNLOAD_LABEL,
  LIBRARY_EMPTY_BODY,
  LIBRARY_EMPTY_TITLE,
  LIBRARY_PLACEHOLDER_NOTE,
  LIBRARY_PRIVATE_COPY,
  LIBRARY_SHARE_DISABLED_REASON,
  LIBRARY_SHARE_LABEL,
  LIBRARY_USE_IN_PACK_HREF,
  adjacentLibraryStillId,
  libraryCopyIsFictionalOnly,
  libraryDownloadAffordance,
  libraryShareAffordance,
  libraryStillCreatedLabel,
  libraryStillPresentation,
  toLibraryStillInput,
} from "@/lib/library-still";
import { TEST_GRID_FICTIONAL_COPY } from "@/lib/test-grid";
import { DEFAULT_STILL_ASPECT_ID } from "@/lib/still-aspect";

describe("library still detail", () => {
  it("presents Jillian demo stills with 3:4 metadata and no invented face copy", () => {
    const still = demoLibraryStills()[0]!;
    const view = libraryStillPresentation({
      id: still.id,
      previewUrl: `/api/media/${still.id}`,
      label: still.label,
      packName: still.packName,
      demo: true,
      hasAsset: still.hasAsset,
      kind: "still",
      createdAt: "2026-09-01T12:00:00.000Z",
      aspectRatio: DEFAULT_STILL_ASPECT_ID,
    });
    expect(still.packId).toBe(DEMO_PACK_IDS.jillian);
    expect(still.hasAsset).toBe(true);
    expect(view.title).toBe("Beach · Sun");
    expect(view.packLine).toBe("Jillian · Character Pack");
    expect(view.aspectLabel).toBe("3:4 Portrait");
    expect(view.alt).toBe(LIBRARY_DEMO_ALT);
    expect(view.badge).toBe("Demo · fictional");
    expect(view.placeholderNote).toBeNull();
    expect(view.tileCaption).toContain("Jillian");
    expect(view.createdLabel).toBe("1 Sep 2026");
    expect(view.privacy).toBe(LIBRARY_PRIVATE_COPY);
    expect(view.alt).not.toMatch(/portrait of|real face|photoreal/i);
  });

  it("keeps own stills private without demo chrome", () => {
    const view = libraryStillPresentation({
      id: "00000000-0000-4000-a000-000000009999",
      previewUrl: "/api/media/00000000-0000-4000-a000-000000009999",
      kind: "still",
    });
    expect(view.title).toBe("Still");
    expect(view.packLine).toBe("Your still");
    expect(view.demo).toBe(false);
    expect(view.badge).toBeNull();
    expect(view.placeholderNote).toBeNull();
    expect(view.alt).toBe("Your still");
    expect(view.aspectLabel).toBe("3:4 Portrait");
  });

  it("stubs download and share — in-app only, nothing public", () => {
    const download = libraryDownloadAffordance();
    const share = libraryShareAffordance();
    expect(download).toEqual({
      label: LIBRARY_DOWNLOAD_LABEL,
      enabled: false,
      reason: LIBRARY_DOWNLOAD_DISABLED_REASON,
    });
    expect(share).toEqual({
      label: LIBRARY_SHARE_LABEL,
      enabled: false,
      reason: LIBRARY_SHARE_DISABLED_REASON,
    });
    expect(share.reason).toMatch(/nothing is public/i);
    expect(LIBRARY_USE_IN_PACK_HREF).toBe("/app/characters");
  });

  it("walks the sheet without wrapping past the ends", () => {
    const ids = ["a", "b", "c"];
    expect(adjacentLibraryStillId(ids, "a", -1)).toBe("a");
    expect(adjacentLibraryStillId(ids, "a", 1)).toBe("b");
    expect(adjacentLibraryStillId(ids, "c", 1)).toBe("c");
    expect(adjacentLibraryStillId(ids, "missing", 1)).toBe("a");
    expect(adjacentLibraryStillId([], null, 1)).toBeNull();
  });

  it("uses champagne empty copy that stays fictional-only", () => {
    expect(LIBRARY_EMPTY_TITLE).toBe("Nothing stored yet");
    expect(demoCopyIsFictionalOnly(LIBRARY_EMPTY_BODY)).toBe(true);
    expect(demoCopyIsFictionalOnly(LIBRARY_DETAIL_EMPTY_BODY)).toBe(true);
    expect(libraryCopyIsFictionalOnly()).toBe(true);
    expect(LIBRARY_PRIVATE_COPY).toMatch(/nothing is public/i);
    expect(LIBRARY_PLACEHOLDER_NOTE).toMatch(/not a face/i);
    expect(DEMO_LIBRARY_COPY).toMatch(/fictional/i);
  });

  it("does not draw faces on leftover placeholder tiles", () => {
    const still = demoLibraryStills()[0]!;
    expect(placeholderHasFaceGeometry(demoPlaceholderSvg(still))).toBe(false);
  });

  it("serializes library rows for the client sheet without leaking storage keys", () => {
    const still = demoLibraryStills()[0]!;
    const input = toLibraryStillInput({
      id: still.id,
      previewUrl: `/api/media/${still.id}`,
      label: still.label,
      packName: still.packName,
      demo: true,
      createdAt: new Date("2026-09-01T12:00:00.000Z"),
      aspectRatio: "3:4",
    });
    expect(input.createdAt).toBe("2026-09-01T12:00:00.000Z");
    expect(input.demo).toBe(true);
    expect(JSON.stringify(input)).not.toMatch(/storageKey|still\//);
  });

  it("does not reopen age, Test grid, or legal copy", () => {
    expect(AGE_ATTEST_COPY).toBe("I confirm I am 18+.");
    expect(TEST_GRID_FICTIONAL_COPY).toMatch(/fictional identity check/i);
    expect(libraryStillCreatedLabel("not-a-date")).toBeNull();
  });
});
