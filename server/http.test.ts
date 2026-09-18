import { describe, expect, it } from "vitest";
import { AuthError } from "@/lib/auth-error";
import { jsonError } from "@/server/http";
import { ObjectNotFoundError } from "@/server/storage";

async function bodyOf(response: Response): Promise<{ error?: string }> {
  return (await response.json()) as { error?: string };
}

describe("jsonError media failures", () => {
  it("returns 401/403 without storage keys", async () => {
    const unauth = jsonError(new AuthError("Sign in required", 401));
    expect(unauth.status).toBe(401);
    expect(await bodyOf(unauth)).toEqual({ error: "Sign in required" });

    const attest = jsonError(new AuthError("Age attestation required", 403));
    expect(attest.status).toBe(403);
    expect(await bodyOf(attest)).toEqual({ error: "Age attestation required" });
  });

  it("maps missing objects to 404 without leaking paths", async () => {
    const missing = jsonError(new ObjectNotFoundError());
    expect(missing.status).toBe(404);
    expect(await bodyOf(missing)).toEqual({ error: "Media not found" });
  });

  it("redacts filesystem and bucket errors", async () => {
    const enoent = jsonError(
      Object.assign(new Error("ENOENT: no such file or directory, open '/workspace/.data/storage/still/u1/x.webp'"), {
        code: "ENOENT",
      }),
    );
    expect(enoent.status).toBe(404);
    const payload = await bodyOf(enoent);
    expect(payload.error).toBe("Media not found");
    expect(JSON.stringify(payload)).not.toMatch(/storage|still\/u1|\.data/);
  });
});
