import { Suspense } from "react";
import { redirect } from "next/navigation";
import { GateHeader } from "@/components/gate-header";
import { InviteForm } from "@/components/invite-form";
import { ensureSessionMatchesUser, getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function InviteRoute() {
  const user = await getCurrentUser();
  if (user) {
    await ensureSessionMatchesUser(user);
    redirect(user.ageAttestedAt ? "/app" : "/age");
  }

  return (
    <>
      <GateHeader />
      <Suspense fallback={<main className="panel card">Loading…</main>}>
        <InviteForm />
      </Suspense>
    </>
  );
}
