"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    try {
      await api("/api/auth/sign-out", { method: "POST" });
    } catch {
      // Cookie clear is best-effort; still leave the studio.
    }
    router.push("/invite");
    router.refresh();
  }

  return (
    <button className="btn secondary" type="button" onClick={onSignOut} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
