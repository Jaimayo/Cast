import { redirect } from "next/navigation";
import { GateHeader } from "@/components/gate-header";
import { AgePolicyAttest } from "@/components/age-policy-attest";
import { nextPathAfterAuth } from "@/lib/auth-entry";
import { ensureSessionMatchesUser, getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AgeRoute() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/invite");
  }
  if (!user) {
    redirect("/invite");
  }
  await ensureSessionMatchesUser(user);
  if (user.ageAttestedAt) {
    redirect(nextPathAfterAuth(user));
  }

  return (
    <>
      <GateHeader />
      <AgePolicyAttest />
    </>
  );
}
