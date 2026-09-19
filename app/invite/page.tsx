import { Suspense } from "react";
import { redirect } from "next/navigation";
import { GateHeader } from "@/components/gate-header";
import { InviteForm } from "@/components/invite-form";
import { nextPathAfterAuth } from "@/lib/auth-entry";
import { ensureSessionMatchesUser, getCurrentUser } from "@/server/auth";

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

  return (
    <>
      <GateHeader />
      <Suspense fallback={<main className="panel card">Loading…</main>}>
        <InviteForm />
      </Suspense>
    </>
  );
}
