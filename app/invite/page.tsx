import { GateHeader } from "@/components/gate-header";
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
      <GateHeader />
      <Suspense
        fallback={
          <main className="mx-auto max-w-md px-5 py-10 text-sm text-muted-foreground">Loading…</main>
        }
      >
        <InviteForm />
      </Suspense>
    </VoidAtmosphere>
  );
}
