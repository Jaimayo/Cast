import { Suspense } from "react";
import InviteForm from "./invite-form";

export default function InviteRoute() {
  return (
    <Suspense fallback={<main className="panel card">Loading…</main>}>
      <InviteForm />
    </Suspense>
  );
}
