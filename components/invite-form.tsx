"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { nextPathAfterAuth } from "@/lib/auth-entry";
import { STUB_REVIEW_ADMIN_HINT } from "@/lib/review-preview";

type AuthPayload = {
  user: { ageAttestedAt: string | null };
  next?: "/invite" | "/age" | "/app";
};

type StubReviewDefaults = {
  email: string;
  inviteCode: string;
};

export function InviteForm(props: { reviewDefaults?: StubReviewDefaults | null }) {
  const params = useSearchParams();
  const router = useRouter();
  const initialMode = params.get("mode") === "signin" ? "signin" : "invite";
  const [mode, setMode] = useState<"invite" | "signin">(initialMode);
  const [email, setEmail] = useState(props.reviewDefaults?.email ?? "");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(props.reviewDefaults?.inviteCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const title = useMemo(() => (mode === "invite" ? "Invite" : "Sign in"), [mode]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === "invite") {
        const data = await api<AuthPayload>("/api/auth/invite", {
          method: "POST",
          body: JSON.stringify({ email, password, inviteCode }),
        });
        router.push(data.next ?? nextPathAfterAuth(data.user));
      } else {
        const data = await api<AuthPayload>("/api/auth/sign-in", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        router.push(data.next ?? nextPathAfterAuth(data.user));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="panel card">
      <div className="kicker">Gated access</div>
      <h1>{title}</h1>
      <p className="muted">Enter your invite code. Invalid, used, or expired codes cannot continue.</p>
      {props.reviewDefaults ? <p className="muted">{STUB_REVIEW_ADMIN_HINT}</p> : null}
      <form onSubmit={onSubmit}>
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
          <>
            <label htmlFor="invite">Invite code</label>
            <input
              id="invite"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              required
            />
          </>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Working…" : "Continue"}
        </button>
      </form>
      <p className="muted">
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
