"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DottedSurface } from "@/components/cast/dotted-surface";
import { GateHeader } from "@/components/cast/gate-header";
import { StatusBadge } from "@/components/cast/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client";

export function InviteForm(props: { reviewInviteCode?: string | null }) {
  const params = useSearchParams();
  const router = useRouter();
  const initialMode = params.get("mode") === "signin" ? "signin" : "invite";
  const [mode, setMode] = useState<"invite" | "signin">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(props.reviewInviteCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const title = useMemo(() => (mode === "invite" ? "You've been invited" : "Welcome back"), [mode]);

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
    <>
      <GateHeader />
      <main className="flex justify-center px-4 pb-20 pt-6">
        <DottedSurface className="w-full max-w-md py-7">
          <div className="space-y-2 px-6">
            <StatusBadge left="Access" right="Invite-only" status="warning" />
            <h1 className="font-heading text-3xl">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "invite"
                ? "Redeem a code to join this private studio. Invalid, used, or expired codes cannot continue."
                : "Sign in with the email you used to redeem your invite."}
            </p>
            {props.reviewInviteCode && mode === "invite" ? (
              <p className="text-xs text-muted-foreground">
                Stub preview: invite code is prefilled. Use any new email and a password of 10+ characters.
              </p>
            ) : null}
          </div>
          <form onSubmit={onSubmit} className="mt-6 space-y-4 px-6">
            {mode === "invite" ? (
              <div className="space-y-2">
                <Label htmlFor="invite">Invite code</Label>
                <Input
                  id="invite"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  required
                  className="tracking-[0.16em]"
                  placeholder="••••••••••••"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "invite" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={mode === "invite" ? 10 : 1}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" size="xl" variant="metallic" className="w-full" disabled={pending}>
              {pending ? "Working…" : "Continue"}
            </Button>
          </form>
          <div className="mt-5 px-6">
            {mode === "invite" ? (
              <Button variant="outline" type="button" className="w-full rounded-full" onClick={() => setMode("signin")}>
                Already have an account
              </Button>
            ) : (
              <Button variant="outline" type="button" className="w-full rounded-full" onClick={() => setMode("invite")}>
                Have an invite code
              </Button>
            )}
          </div>
        </DottedSurface>
      </main>
    </>
  );
}
