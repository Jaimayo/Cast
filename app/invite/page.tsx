import { GateStage } from "@/components/gate-stage";
import { InviteForm } from "@/components/invite-form";
import { VoidAtmosphere } from "@/components/void-atmosphere";
import { ensureSessionMatchesUser, getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function InviteRoute() {
  const user = await getCurrentUser();
  if (user) {
    await ensureSessionMatchesUser(user);
    redirect(user.ageAttestedAt ? "/app" : "/age");
  }

  return (
    <VoidAtmosphere>
      <GateStage
        kicker="Gated access"
        headline="Enter with an invite."
        subhead="Invite-only studio. Invalid, used, or expired codes cannot continue."
      >
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <InviteForm />
        </Suspense>
      </GateStage>
    </VoidAtmosphere>
  );
}
