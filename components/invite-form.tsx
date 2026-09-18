"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";

export function InviteForm() {
  const params = useSearchParams();
  const router = useRouter();
  const initialMode = params.get("mode") === "signin" ? "signin" : "invite";
  const [mode, setMode] = useState<"invite" | "signin">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const title = useMemo(() => (mode === "invite" ? "Enter with invite" : "Welcome back"), [mode]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === "invite") {
        await api("/api/auth/invite", {
          method: "POST",
          body: JSON.stringify({ email, password, inviteCode }),
        });
        router.push("/age");
      } else {
        const data = await api<{ user: { ageAttestedAt: string | null } }>("/api/auth/sign-in", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        router.push(data.user.ageAttestedAt ? "/app" : "/age");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="panel card gate-card">
      <div className="kicker">Gated access</div>
      <h1>{title}</h1>
      <p className="lede-sm">
        Private studio. Invalid, used, or expired codes cannot continue. No public signup.
      </p>
      <form onSubmit={onSubmit}>
        {mode === "invite" ? (
          <>
            <label htmlFor="invite">Invite code</label>
            <input
              id="invite"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              autoComplete="one-time-code"
              placeholder="Paste your code"
              required
            />
          </>
        ) : null}
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete={mode === "invite" ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={mode === "invite" ? 10 : 1}
          required
        />
        {mode === "invite" ? (
          <p className="muted">Password must be at least 10 characters.</p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Working…" : "Continue"}
        </button>
      </form>
      <p className="gate-switch">
        {mode === "invite" ? (
          <button className="btn secondary" type="button" onClick={() => setMode("signin")}>
            Already have an account
          </button>
        ) : (
          <button className="btn secondary" type="button" onClick={() => setMode("invite")}>
            Have an invite code
          </button>
        )}
      </p>
    </main>
  );
}
