import { AuthError } from "@/lib/auth-error";

/** Stage 1 lock. Do not paraphrase. */
export const AGE_ATTEST_COPY = "I confirm I am 18+.";

export const AGE_INCOMPLETE_MESSAGE = "Both confirmations are required.";

export type AgeAttestBody = {
  attested: boolean;
  fictionalOnly: boolean;
};

export function isCompleteAgeAttest(input: {
  attested?: unknown;
  fictionalOnly?: unknown;
}): input is AgeAttestBody & { attested: true; fictionalOnly: true } {
  return input.attested === true && input.fictionalOnly === true;
}

/** Reject incomplete or under-18 (unchecked) attest. Exact 18+ copy is UI-only; API requires both flags. */
export function assertCompleteAgeAttest(input: {
  attested?: unknown;
  fictionalOnly?: unknown;
}): asserts input is AgeAttestBody & { attested: true; fictionalOnly: true } {
  if (!isCompleteAgeAttest(input)) {
    throw new AuthError(AGE_INCOMPLETE_MESSAGE, 400);
  }
}
