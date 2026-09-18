"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <main className="mx-auto flex w-full max-w-md px-5 pb-24 pt-6">
      <Card className="cast-surface w-full rounded-xl py-6 ring-border">
        <CardHeader className="gap-2">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Gated access</p>
          <CardTitle className="font-heading text-3xl">{title}</CardTitle>
          <CardDescription>
            Enter your invite code. Invalid, used, or expired codes cannot continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-11 rounded-xl bg-muted/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "invite" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={mode === "invite" ? 10 : 1}
                required
                className="h-11 rounded-xl bg-muted/50"
              />
            </div>
            {mode === "invite" ? (
              <div className="grid gap-2">
                <Label htmlFor="invite" className="text-muted-foreground">
                  Invite code
                </Label>
                <Input
                  id="invite"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  required
                  className="h-11 rounded-xl bg-muted/50 font-mono tracking-wide"
                />
              </div>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending} className="h-11 w-full rounded-full">
              {pending ? "Working…" : "Continue"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setMode(mode === "invite" ? "signin" : "invite")}
            >
              {mode === "invite" ? "Already have an account" : "Have an invite code"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
