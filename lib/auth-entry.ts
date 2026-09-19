/**
 * Where a signed-in user should land after invite/sign-in.
 * Already-attested → studio. Missing attest → age gate. No session → invite.
 */

export type AuthLanding = "/invite" | "/age" | "/app";

export function nextPathAfterAuth(user: { ageAttestedAt: Date | string | null } | null): AuthLanding {
  if (!user) {
    return "/invite";
  }
  return user.ageAttestedAt ? "/app" : "/age";
}

/** GET /invite with a live session: attested users skip the form and enter studio. */
export function inviteReentryPath(user: { ageAttestedAt: Date | string | null } | null): AuthLanding {
  return nextPathAfterAuth(user);
}
