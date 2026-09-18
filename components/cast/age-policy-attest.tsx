"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GateHeader } from "@/components/cast/gate-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client";

export function AgePolicyAttest() {
  const router = useRouter();
  const [age, setAge] = useState(false);
  const [fictional, setFictional] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ready = age && fictional;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) {
      setError("Both confirmations are required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/age", {
        method: "POST",
        body: JSON.stringify({ attested: true, fictionalOnly: true }),
      });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attest");
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
            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">Age confirmation</p>
            <CardTitle className="font-heading text-3xl">Adults only</CardTitle>
            <CardDescription>Studio access requires both confirmations.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <Label
                htmlFor="age"
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 leading-snug font-normal"
              >
                <Checkbox
                  id="age"
                  checked={age}
                  onCheckedChange={(value) => setAge(value === true)}
                  className="mt-0.5 size-5"
                />
                <span>I confirm I am 18+.</span>
              </Label>
              <Label
                htmlFor="policy"
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 leading-snug font-normal"
              >
                <Checkbox
                  id="policy"
                  checked={fictional}
                  onCheckedChange={(value) => setFictional(value === true)}
                  className="mt-0.5 size-5"
                />
                <span className="text-muted-foreground">
                  I will only create fictional, clearly-adult subjects. I will not upload or imitate real
                  people.
                </span>
              </Label>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button type="submit" size="xl" className="flex-1" disabled={!ready || pending}>
                  {pending ? "Saving…" : "Enter studio"}
                </Button>
                <Button asChild variant="outline" size="xl" className="flex-1 rounded-full">
                  <a href="/">Leave</a>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
