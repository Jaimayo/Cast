"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GateHeader } from "@/components/cast/gate-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const title = useMemo(() => (mode === "invite" ? "Invite" : "Sign in"), [mode]);

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
        <Card className="cast-surface w-full max-w-md border-border bg-card/85 py-6 backdrop-blur-md">
          <CardHeader className="gap-2">
            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">Gated access</p>
            <CardTitle className="font-heading text-3xl">{title}</CardTitle>
            <CardDescription>
              Enter your invite code. Invalid, used, or expired codes cannot continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
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
              {mode === "invite" ? (
                <div className="space-y-2">
                  <Label htmlFor="invite">Invite code</Label>
                  <Input
                    id="invite"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    required
                    className="tracking-[0.14em]"
                  />
                </div>
              ) : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" size="xl" className="w-full" disabled={pending}>
                {pending ? "Working…" : "Continue"}
              </Button>
            </form>
            <div className="mt-5">
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
          </CardContent>
        </Card>
      </main>
    </>
  );
}
