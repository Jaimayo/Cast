import { Suspense } from "react";
import { redirect } from "next/navigation";
import { GateHeader } from "@/components/gate-header";
import { InviteForm } from "@/components/invite-form";
import { nextPathAfterAuth } from "@/lib/auth-entry";
import { DEFAULT_REVIEW_ADMIN_EMAIL, stubReviewInviteCode } from "@/lib/review-preview";
import { ensureSessionMatchesUser, getCurrentUser } from "@/server/auth";
import { getEnv } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function InviteRoute() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  if (user) {
    await ensureSessionMatchesUser(user);
    redirect(nextPathAfterAuth(user));
  }

  const env = getEnv();
  const reviewCode = stubReviewInviteCode(env.providerMode, process.env.REVIEW_INVITE_CODE);
  const reviewDefaults = reviewCode
    ? { email: DEFAULT_REVIEW_ADMIN_EMAIL, inviteCode: reviewCode }
    : null;

  return (
    <>
      <GateHeader />
      <Suspense fallback={<main className="panel card">Loading…</main>}>
        <InviteForm reviewDefaults={reviewDefaults} />
      </Suspense>
    </>
  );
}
