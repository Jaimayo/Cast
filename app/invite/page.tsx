import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CastShell } from "@/components/cast/cast-shell";
import { InviteForm } from "@/components/cast/invite-form";
import { ensureSessionMatchesUser, getCurrentUser } from "@/server/auth";
import { ensureStubReviewInvite, previewReviewInviteCode } from "@/server/review-bootstrap";

export const dynamic = "force-dynamic";

export default async function InviteRoute() {
  const user = await getCurrentUser();
  if (user) {
    await ensureSessionMatchesUser(user);
    redirect(user.ageAttestedAt ? "/app" : "/age");
  }

  try {
    await ensureStubReviewInvite();
  } catch {
    // Form still renders; redeem reports missing env/DB.
  }

  return (
    <CastShell variant="gate">
      <Suspense fallback={<main className="px-6 py-16 text-center text-muted-foreground">Loading…</main>}>
        <InviteForm reviewInviteCode={previewReviewInviteCode()} />
      </Suspense>
    </CastShell>
  );
}
