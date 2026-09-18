import { Suspense } from "react";
import { GateHeader } from "@/components/gate-header";
import { InviteForm } from "@/components/invite-form";

export default function InviteRoute() {
  return (
    <>
      <GateHeader />
      <Suspense fallback={<main className="panel card">Loading…</main>}>
        <InviteForm />
      </Suspense>
    </>
  );
}
