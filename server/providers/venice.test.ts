import { afterEach, describe, expect, it, vi } from "vitest";
import { VeniceConnectError } from "@/lib/venice-settings";
import { compileComposerPrompt } from "@/lib/prompt-compiler";
import { JOB_ERROR_CODES, JobError, classifyJobError } from "@/lib/job-errors";
import { shouldFallbackGenerateStill } from "@/server/providers/registry";
import { ProviderNotConfiguredError, ProviderTimeoutError } from "@/server/providers/types";
import {
  VENICE_DEFAULT_IMAGE_MODEL,
  buildVeniceGenerateRequest,
  decodeVeniceImage,
  looksLikeVeniceBalanceError,
  looksLikeVenicePolicyReject,
  veniceAdapter,
  veniceErrorFromHttp,
  veniceImageGenerateUrl,
  veniceModelsUrl,
  veniceSizingMode,
  validateVeniceApiKey,
} from "@/server/providers/venice";
import { resetVeniceSecretOverlayForTests, saveVeniceApiKey } from "@/server/venice-secret";

const PLACEHOLDER_WEBP = Buffer.from(
  "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=",
  "base64",
);

const generateInput = {
  jobId: "job-venice-1",
  prompt: "wholly fictional adult human. pose: standing upright. compiled secret pose",
  negativePrompt: "child, minor, celebrity",
  characterPackId: "pack-1",
  adapterStorageKey: "adapters/u/p.lora",
  adapterMeta: { sourceUrl: "https://example.invalid/secret.safetensors" },
  attempt: 1,
};

function jsonResponse(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

describe("Venice generateStill request mapping", () => {
  it("defaults to lustify-v8 pixel stills and maps chips → prompt / negative_prompt", () => {
    expect(VENICE_DEFAULT_IMAGE_MODEL).toBe("lustify-v8");
    expect(veniceSizingMode("lustify-v8")).toBe("pixel");
    expect(veniceSizingMode("nano-banana-pro")).toBe("resolution");
    expect(veniceSizingMode("qwen-image-2")).toBe("aspect");

    const compiled = compileComposerPrompt({
      characterPackName: "Mara",
      characterPackId: "pack_123",
      poseChipId: "standing-neutral",
      outfitChipId: "tailored-black",
    });
    const body = buildVeniceGenerateRequest({
      prompt: compiled.prompt,
      negativePrompt: compiled.negativePrompt,
      model: VENICE_DEFAULT_IMAGE_MODEL,
      safeMode: false,
    });

    expect(body.model).toBe("lustify-v8");
    expect(body.prompt).toBe(compiled.prompt);
    expect(body.prompt).toContain("pose: standing upright");
    expect(body.prompt).toContain("wardrobe: tailored black outfit");
    expect(body.negative_prompt).toBe(compiled.negativePrompt);
    expect(body.negative_prompt).toMatch(/child/i);
    expect(body.width).toBe(1024);
    expect(body.height).toBe(1024);
    expect(body.aspect_ratio).toBeUndefined();
    expect(body.resolution).toBeUndefined();
    expect(body.safe_mode).toBe(false);
    expect(body.return_binary).toBe(false);
    expect(body.embed_exif_metadata).toBe(false);
    expect(body.variants).toBe(1);
    expect(JSON.stringify(body)).not.toMatch(/lora|adapterStorageKey|soul/i);
    expect(veniceImageGenerateUrl("https://api.venice.ai/api/v1/")).toBe(
      "https://api.venice.ai/api/v1/image/generate",
    );
    expect(veniceModelsUrl("https://api.venice.ai/api/v1/")).toBe(
      "https://api.venice.ai/api/v1/models?type=image",
    );
  });

  it("uses aspect_ratio / resolution only for models that require them", () => {
    const nano = buildVeniceGenerateRequest({
      prompt: "still",
      model: "nano-banana-2",
      safeMode: false,
    });
    expect(nano.aspect_ratio).toBe("3:4");
    expect(nano.resolution).toBe("1K");
    expect(nano.width).toBeUndefined();
    expect(nano.height).toBeUndefined();
  });

  it("maps Composer Frame onto pixel size and aspect_ratio models", () => {
    const portrait = buildVeniceGenerateRequest({
      prompt: "still",
      model: "lustify-v8",
      safeMode: false,
      width: 768,
      height: 1024,
      aspectRatio: "3:4",
    });
    expect(portrait.width).toBe(768);
    expect(portrait.height).toBe(1024);
    expect(portrait.aspect_ratio).toBeUndefined();

    const wide = buildVeniceGenerateRequest({
      prompt: "still",
      model: "nano-banana-2",
      safeMode: false,
      aspectRatio: "16:9",
    });
    expect(wide.aspect_ratio).toBe("16:9");
    expect(wide.width).toBeUndefined();
  });

  it("omits empty negative_prompt", () => {
    const body = buildVeniceGenerateRequest({
      prompt: "still",
      negativePrompt: "  ",
      model: "lustify-v8",
      safeMode: true,
    });
    expect(body.negative_prompt).toBeUndefined();
    expect(body.safe_mode).toBe(true);
  });
});

describe("Venice HTTP error mapping", () => {
  it("maps 402 / INSUFFICIENT_BALANCE without echoing vendor payloads", () => {
    expect(looksLikeVeniceBalanceError({ status: 402 })).toBe(true);
    const err = veniceErrorFromHttp({
      status: 402,
      payload: {
        code: "INSUFFICIENT_BALANCE",
        error: "top up at venice.ai prompt=secret pose Authorization: Bearer sk-live",
      },
    });
    expect(err).toBeInstanceOf(JobError);
    expect((err as JobError).code).toBe(JOB_ERROR_CODES.PROVIDER_INSUFFICIENT_BALANCE);
    expect(err.message).not.toMatch(/secret pose|Bearer|sk-live|top up/i);
    expect(classifyJobError(err).userMessage).toBe(
      "The image service is out of credits. Try again after balance is restored.",
    );
  });

  it("maps policy rejects from header or body", () => {
    const headers = new Headers({ "x-venice-is-content-violation": "true" });
    expect(looksLikeVenicePolicyReject({ headers })).toBe(true);
    const fromBody = veniceErrorFromHttp({
      status: 400,
      payload: { code: "CONTENT_VIOLATION", error: "prompt=secret pose violates terms" },
    });
    expect((fromBody as JobError).code).toBe(JOB_ERROR_CODES.GENERATE_POLICY_REJECT);
    expect(fromBody.message).not.toMatch(/secret pose|terms/);
  });

  it("maps 429 as a retryable rate limit", () => {
    const err = veniceErrorFromHttp({ status: 429, payload: { error: "slow down" } });
    expect((err as JobError).code).toBe(JOB_ERROR_CODES.PROVIDER_RATE_LIMIT);
    expect((err as JobError).retryable).toBe(true);
  });
});

describe("Venice generateStill adapter (mocked HTTP)", () => {
  afterEach(() => {
    resetVeniceSecretOverlayForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubVeniceEnv() {
    vi.stubEnv("VENICE_API_KEY", "test-venice-key");
    vi.stubEnv("VENICE_API_BASE_URL", "https://api.venice.ai/api/v1");
    vi.stubEnv("VENICE_IMAGE_MODEL", "lustify-v8");
    vi.stubEnv("VENICE_SAFE_MODE", "false");
  }

  it("throws when VENICE_API_KEY is missing and does not fall back for policy errors", async () => {
    vi.stubEnv("VENICE_API_KEY", "");
    await expect(veniceAdapter.generateStill(generateInput)).rejects.toBeInstanceOf(
      ProviderNotConfiguredError,
    );
    expect(shouldFallbackGenerateStill("venice", new ProviderNotConfiguredError("venice"))).toBe(true);
    expect(
      shouldFallbackGenerateStill(
        "venice",
        new JobError({ code: JOB_ERROR_CODES.GENERATE_POLICY_REJECT, retryable: false }),
      ),
    ).toBe(false);
    expect(
      shouldFallbackGenerateStill(
        "venice",
        new JobError({ code: JOB_ERROR_CODES.PROVIDER_INSUFFICIENT_BALANCE, retryable: false }),
      ),
    ).toBe(false);
    expect(shouldFallbackGenerateStill("runpod", new ProviderNotConfiguredError("venice"))).toBe(false);
  });

  it("uses a settings-stored key when VENICE_API_KEY env is empty", async () => {
    vi.stubEnv("VENICE_API_KEY", "");
    vi.stubEnv("VENICE_API_BASE_URL", "https://api.venice.ai/api/v1");
    vi.stubEnv("VENICE_IMAGE_MODEL", "lustify-v8");
    await saveVeniceApiKey({ apiKey: "settings-only-venice-key", actorId: "admin-1" });
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "generate-image-settings",
        images: [PLACEHOLDER_WEBP.toString("base64")],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const still = await veniceAdapter.generateStill(generateInput);
    expect(still.providerJobId).toBe("generate-image-settings");
    const headers = new Headers((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers);
    expect(headers.get("Authorization")).toBe("Bearer settings-only-venice-key");
  });

  it("POSTs native /image/generate and stores the first base64 still", async () => {
    stubVeniceEnv();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "generate-image-99",
        images: [PLACEHOLDER_WEBP.toString("base64")],
        timing: { inferenceDuration: 1, inferencePreprocessingTime: 1, inferenceQueueTime: 1, total: 4 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const still = await veniceAdapter.generateStill(generateInput);
    expect(still.provider).toBe("venice");
    expect(still.providerJobId).toBe("generate-image-99");
    expect(still.mimeType).toBe("image/webp");
    expect(still.imageBytes.equals(PLACEHOLDER_WEBP)).toBe(true);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.venice.ai/api/v1/image/generate");
    expect(url).not.toMatch(/images\/generations/);
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-venice-key");
    const posted = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(posted.model).toBe("lustify-v8");
    expect(posted.prompt).toBe(generateInput.prompt);
    expect(posted.negative_prompt).toBe(generateInput.negativePrompt);
    expect(posted.safe_mode).toBe(false);
    expect(posted).not.toHaveProperty("lora_strength");
    expect(posted).not.toHaveProperty("adapterStorageKey");
    expect(JSON.stringify(posted)).not.toMatch(/secret\.safetensors/);
  });

  it("accepts data-URL images and raw binary responses", async () => {
    stubVeniceEnv();
    const dataUrl = `data:image/png;base64,${PLACEHOLDER_WEBP.toString("base64")}`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ id: "img-data", images: [dataUrl] })),
    );
    const fromJson = await veniceAdapter.generateStill(generateInput);
    expect(fromJson.mimeType).toBe("image/png");
    expect(fromJson.imageBytes.equals(PLACEHOLDER_WEBP)).toBe(true);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(PLACEHOLDER_WEBP, {
          status: 200,
          headers: { "Content-Type": "image/webp" },
        }),
      ),
    );
    const fromBinary = await veniceAdapter.generateStill(generateInput);
    expect(fromBinary.mimeType).toBe("image/webp");
    expect(fromBinary.imageBytes.equals(PLACEHOLDER_WEBP)).toBe(true);
  });

  it("returns user-safe 402, 429, policy, timeout, and empty-still errors", async () => {
    stubVeniceEnv();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "INSUFFICIENT_BALANCE" }, { status: 402 })));
    await expect(veniceAdapter.generateStill(generateInput)).rejects.toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_INSUFFICIENT_BALANCE,
      retryable: false,
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "slow down" }, { status: 429 })));
    await expect(veniceAdapter.generateStill(generateInput)).rejects.toMatchObject({
      code: JOB_ERROR_CODES.PROVIDER_RATE_LIMIT,
      retryable: true,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { images: [PLACEHOLDER_WEBP.toString("base64")], id: "blurred" },
          { headers: { "x-venice-is-content-violation": "true" } },
        ),
      ),
    );
    await expect(veniceAdapter.generateStill(generateInput)).rejects.toMatchObject({
      code: JOB_ERROR_CODES.GENERATE_POLICY_REJECT,
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ id: "empty", images: [] })));
    await expect(veniceAdapter.generateStill(generateInput)).rejects.toMatchObject({
      code: JOB_ERROR_CODES.GENERATE_NO_IMAGE,
    });

    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));
    await expect(veniceAdapter.generateStill(generateInput)).rejects.toBeInstanceOf(ProviderTimeoutError);
    expect(classifyJobError(new ProviderTimeoutError()).userMessage).toBe(
      "The image service took too long. Try again.",
    );
  });

  it("never puts the prompt, key, or stack into thrown errors", async () => {
    stubVeniceEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: `rejected compiled prompt ${generateInput.prompt} key=test-venice-key`,
            code: "CONTENT_VIOLATION",
          },
          { status: 400 },
        ),
      ),
    );
    try {
      await veniceAdapter.generateStill(generateInput);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(JobError);
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : "";
      expect(message).not.toMatch(/compiled secret pose|test-venice-key|standing upright/);
      expect(classifyJobError(err).userMessage).not.toMatch(/compiled|Bearer|test-venice-key/);
      expect(stack).toBeTruthy();
      expect(classifyJobError(err).userMessage).not.toMatch(/\n {4}at /);
    }
  });
});

describe("validateVeniceApiKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("accepts a cheap GET /models?type=image success and 402", async () => {
    vi.stubEnv("VENICE_API_BASE_URL", "https://api.venice.ai/api/v1");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: "lustify-v8" }] }));
    vi.stubGlobal("fetch", fetchMock);
    await validateVeniceApiKey("sk-live-valid-key-0001");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.venice.ai/api/v1/models?type=image");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer sk-live-valid-key-0001");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "INSUFFICIENT_BALANCE" }, { status: 402 })));
    await expect(validateVeniceApiKey("sk-live-valid-key-0001")).resolves.toBeUndefined();
  });

  it("maps 401 and vendor dumps to user-safe copy without echoing the key", async () => {
    vi.stubEnv("VENICE_API_BASE_URL", "https://api.venice.ai/api/v1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: "invalid Authorization Bearer sk-live-valid-key-0001 dump" }, { status: 401 }),
      ),
    );
    await expect(validateVeniceApiKey("sk-live-valid-key-0001")).rejects.toBeInstanceOf(VeniceConnectError);
    try {
      await validateVeniceApiKey("sk-live-valid-key-0001");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toBe("Venice didn't accept that key. Check it at venice.ai/settings/api.");
      expect(message).not.toMatch(/sk-live-valid-key-0001|Bearer|dump/i);
    }
  });
});

describe("decodeVeniceImage", () => {
  it("strips data URLs", () => {
    const decoded = decodeVeniceImage(`data:image/jpeg;base64,${PLACEHOLDER_WEBP.toString("base64")}`);
    expect(decoded.mimeType).toBe("image/jpeg");
    expect(decoded.bytes.equals(PLACEHOLDER_WEBP)).toBe(true);
  });
});
