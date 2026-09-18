import { AuthError } from "@/lib/auth-error";

export function assertSignedIn<T>(user: T | null | undefined): T {
  if (!user) {
    throw new AuthError("Sign in required", 401);
  }
  return user;
}

export function assertAttested<T extends { ageAttestedAt: Date | string | null }>(
  user: T | null | undefined,
): T {
  const signedIn = assertSignedIn(user);
  if (!signedIn.ageAttestedAt) {
    throw new AuthError("Age attestation required", 403);
  }
  return signedIn;
}

export function assertAdmin<T extends { ageAttestedAt: Date | string | null; role: string }>(
  user: T | null | undefined,
): T {
  const attested = assertAttested(user);
  if (attested.role !== "admin") {
    throw new AuthError("Admin only", 403);
  }
  return attested;
}

export function roleForEmail(email: string, adminEmails: readonly string[]): "admin" | "consumer" {
  return adminEmails.includes(email.trim().toLowerCase()) ? "admin" : "consumer";
}

export function sessionAgeFlag(ageAttestedAt: Date | string | null | undefined): boolean {
  return Boolean(ageAttestedAt);
}
