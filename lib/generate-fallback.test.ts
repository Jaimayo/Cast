import { describe, expect, it } from "vitest";
import { shouldFallbackGenerateStill } from "@/lib/generate-fallback";
import { JOB_ERROR_CODES, JobError } from "@/lib/job-errors";
import { ProviderHttpError, ProviderNotConfiguredError } from "@/server/providers/types";

describe("shouldFallbackGenerateStill", () => {
  it("falls back when Venice is not configured", () => {
    expect(
      shouldFallbackGenerateStill({
        primaryAdapterName: "venice",
        err: new ProviderNotConfiguredError("venice"),
      }),
    ).toBe(true);
  });

  it("falls back on transient Venice HTTP / network errors", () => {
    expect(
      shouldFallbackGenerateStill({
        primaryAdapterName: "venice",
        err: new ProviderHttpError("venice", 503),
      }),
    ).toBe(true);
    expect(
      shouldFallbackGenerateStill({
        primaryAdapterName: "venice",
        err: new Error("fetch failed"),
      }),
    ).toBe(true);
  });

  it("does not fall back on permanent Venice rejections", () => {
    expect(
      shouldFallbackGenerateStill({
        primaryAdapterName: "venice",
        err: new ProviderHttpError("venice", 400),
      }),
    ).toBe(false);
    expect(
      shouldFallbackGenerateStill({
        primaryAdapterName: "venice",
        err: new JobError({ code: JOB_ERROR_CODES.GENERATE_NO_IMAGE }),
      }),
    ).toBe(false);
    expect(
      shouldFallbackGenerateStill({
        primaryAdapterName: "venice",
        err: new JobError({ code: JOB_ERROR_CODES.PACK_NOT_LOCKED }),
      }),
    ).toBe(false);
  });

  it("does not fall back mid-poll or when the primary is already RunPod", () => {
    expect(
      shouldFallbackGenerateStill({
        primaryAdapterName: "venice",
        err: new ProviderNotConfiguredError("venice"),
        hasProviderJobId: true,
      }),
    ).toBe(false);
    expect(
      shouldFallbackGenerateStill({
        primaryAdapterName: "runpod",
        err: new ProviderHttpError("runpod", 503),
      }),
    ).toBe(false);
  });
});
