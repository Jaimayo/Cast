import { describe, expect, it } from "vitest";
import {
  extractGenerateImage,
  GENERATE_POLL_MAX_ATTEMPTS,
  generateStillTimedOut,
  shouldKeepPollingGenerate,
} from "@/server/providers/generate-output";

describe("RunPod generateStill output", () => {
  it("extracts base64 images from worker output", () => {
    expect(
      extractGenerateImage({
        images: ["UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA="],
        mimeType: "image/webp",
      }),
    ).toMatchObject({
      mimeType: "image/webp",
      bytesBase64: "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=",
    });
  });

  it("extracts data URLs and image URLs", () => {
    expect(
      extractGenerateImage({
        output: { image: "data:image/png;base64,AAAA" },
      }),
    ).toMatchObject({ mimeType: "image/png", bytesBase64: "AAAA" });

    expect(
      extractGenerateImage({
        image_url: "https://example.invalid/still.webp",
      }),
    ).toMatchObject({
      mimeType: "image/webp",
      sourceUrl: "https://example.invalid/still.webp",
    });
  });

  it("returns null when the payload has no still", () => {
    expect(extractGenerateImage({ hello: "nope" })).toBeNull();
  });

  it("polls generate like train while queued/running", () => {
    expect(shouldKeepPollingGenerate("IN_QUEUE")).toBe(true);
    expect(shouldKeepPollingGenerate("IN_PROGRESS")).toBe(true);
    expect(shouldKeepPollingGenerate(undefined)).toBe(true);
    expect(shouldKeepPollingGenerate("COMPLETED")).toBe(false);
    expect(shouldKeepPollingGenerate("FAILED")).toBe(false);
    expect(generateStillTimedOut(GENERATE_POLL_MAX_ATTEMPTS)).toBe(false);
    expect(generateStillTimedOut(GENERATE_POLL_MAX_ATTEMPTS + 1)).toBe(true);
  });
});
