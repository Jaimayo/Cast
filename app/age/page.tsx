import { redirect } from "next/navigation";
import { AgePolicyAttest } from "@/components/cast/age-policy-attest";
import { CastShell } from "@/components/cast/cast-shell";
import { ensureSessionMatchesUser, getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AgeRoute() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  if (!user) {
    redirect("/invite");
  }
  await ensureSessionMatchesUser(user);
  if (user.ageAttestedAt) {
    redirect("/app");
  }

  return (
    <CastShell variant="gate">
      <AgePolicyAttest />
    </CastShell>
  );
}
