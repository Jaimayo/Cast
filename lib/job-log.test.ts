import { describe, expect, it } from "vitest";
import { publicJobLogFields } from "@/lib/job-log";

describe("publicJobLogFields", () => {
  it("keeps job identifiers and drops prompts, secrets, and payloads", () => {
    const fields = publicJobLogFields({
      jobId: "job-1",
      kind: "generate_still",
      packId: "pack-1",
      provider: "venice",
      status: "running",
      attempt: 2,
      prompt: "wholly fictional adult human…",
      negativePrompt: "child, minor",
      apiKey: "sk-secret",
      authorization: "Bearer sk-secret",
      imageBytes: "AAAA",
      adapterBytesBase64: "BBBB",
      compiledPrompt: "hidden",
    });
    expect(fields).toEqual({
      jobId: "job-1",
      kind: "generate_still",
      packId: "pack-1",
      provider: "venice",
      status: "running",
      attempt: 2,
    });
    expect(JSON.stringify(fields)).not.toMatch(/secret|Bearer|AAAA/i);
  });

  it("keeps prompt hashes so policy hits can be audited without the prompt", () => {
    const fields = publicJobLogFields({
      jobId: "job-3",
      prompt: "wholly fictional adult human, child",
      promptHash: "a".repeat(64),
      compiledPromptHash: "b".repeat(64),
      compiledPrompt: "hidden",
    });
    expect(fields).toEqual({
      jobId: "job-3",
      promptHash: "a".repeat(64),
      compiledPromptHash: "b".repeat(64),
    });
    expect(JSON.stringify(fields)).not.toMatch(/wholly fictional|child|hidden/);
  });

  it("drops nested objects and buffers", () => {
    const fields = publicJobLogFields({
      jobId: "job-2",
      adapterMeta: { sourceUrl: "https://example.invalid" },
      body: Buffer.from("nope"),
    });
    expect(fields).toEqual({ jobId: "job-2" });
  });
});
