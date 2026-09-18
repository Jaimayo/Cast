import { describe, expect, it } from "vitest";
import {
  extractGenerateImage,
  GENERATE_POLL_DELAY_MS,
  GENERATE_POLL_MAX_ATTEMPTS,
  generatePollDecision,
  generatePollDelayMs,
  generateStillHasImage,
  generateStillTimedOut,
  runPodGenerateErrorCode,
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

  it("schedules delayed generate polls and maps RunPod generate failures", () => {
    expect(generatePollDelayMs(1)).toBe(GENERATE_POLL_DELAY_MS);
    expect(generatePollDelayMs(12)).toBe(8_000);
    expect(generatePollDelayMs(30)).toBe(15_000);
    expect(generatePollDecision({ status: "queued", attempt: 0 })).toEqual({
      action: "poll",
      nextAttempt: 1,
    });
    expect(generatePollDecision({ status: "succeeded", attempt: 2 })).toEqual({ action: "complete" });
    expect(
      generatePollDecision({
        status: "failed",
        attempt: 2,
        errorCode: "GENERATE_NO_IMAGE",
      }),
    ).toEqual({ action: "fail", errorCode: "GENERATE_NO_IMAGE" });
    expect(generatePollDecision({ status: "running", attempt: GENERATE_POLL_MAX_ATTEMPTS })).toEqual({
      action: "timeout",
      errorCode: "GENERATE_POLL_TIMEOUT",
    });
    expect(runPodGenerateErrorCode("COMPLETED")).toBeNull();
    expect(runPodGenerateErrorCode("TIMED_OUT")).toBe("GENERATE_POLL_TIMEOUT");
    expect(runPodGenerateErrorCode("FAILED", "GENERATE_NO_IMAGE")).toBe("GENERATE_NO_IMAGE");
    expect(runPodGenerateErrorCode("FAILED")).toBe("GENERATE_STILL_FAILED");
    expect(generateStillHasImage({ mimeType: "image/webp", imageBytes: Buffer.from("x") })).toBe(true);
    expect(generateStillHasImage({ mimeType: "image/webp" })).toBe(false);
  });
});
