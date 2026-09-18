import { redirect } from "next/navigation";
import { GateHeader } from "@/components/gate-header";
import { AgePolicyAttest } from "@/components/age-policy-attest";
import { ensureSessionMatchesUser, getCurrentUser } from "@/server/auth";

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
    <>
      <GateHeader />
      <AgePolicyAttest />
    </>
  );
}
