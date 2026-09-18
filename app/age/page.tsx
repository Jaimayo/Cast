import { GateStage } from "@/components/gate-stage";
import { AgePolicyAttest } from "@/components/age-policy-attest";
import { VoidAtmosphere } from "@/components/void-atmosphere";
import { ensureSessionMatchesUser, getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AgeRoute() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/invite");
  }
  await ensureSessionMatchesUser(user);
  if (user.ageAttestedAt) {
    redirect("/app");
  }

  return (
    <VoidAtmosphere>
      <GateStage
        kicker="Age confirmation"
        headline="Adults only."
        subhead="Both confirmations are required to enter the studio."
      >
        <AgePolicyAttest />
      </GateStage>
    </VoidAtmosphere>
  );
}
