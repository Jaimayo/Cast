import { createHash } from "node:crypto";

/** RFC 9562 UUID version 8 (custom) from SHA-256(email). Stable across stub logins. */
export function stubPreviewUserId(email: string): string {
  const normalized = email.trim().toLowerCase();
  const digest = createHash("sha256").update(`cast.stub.user:${normalized}`).digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x80;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Truncated SHA-256 so stub cookies can match a user without storing the email. */
export function stubPreviewEmailHash(email: string): string {
  return createHash("sha256")
    .update(`cast.stub.email:${email.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}
