import { describe, expect, it } from "vitest";
import { stubPreviewEmailHash, stubPreviewUserId } from "@/lib/stub-user-id";

describe("stub preview user identity", () => {
  it("reuses a stable UUID for the same email and differs across emails", () => {
    const a = stubPreviewUserId("venice-qa@cast.review");
    const b = stubPreviewUserId("  Venice-QA@cast.review  ");
    const other = stubPreviewUserId("other@cast.review");
    expect(a).toBe(b);
    expect(a).not.toBe(other);
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("hashes email without echoing the address", () => {
    const email = "venice-qa@cast.review";
    const hash = stubPreviewEmailHash(email);
    expect(hash).toBe(stubPreviewEmailHash("Venice-QA@cast.review"));
    expect(hash).toHaveLength(32);
    expect(hash).not.toContain("venice");
    expect(hash).not.toContain("@");
    expect(hash).not.toBe(stubPreviewEmailHash("other@cast.review"));
  });
});
