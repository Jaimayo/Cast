"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

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
    <main className="mx-auto flex w-full max-w-md px-5 pb-24 pt-6">
      <Card className="cast-surface w-full rounded-xl py-6 ring-border">
        <CardHeader className="gap-2">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Age confirmation</p>
          <CardTitle className="font-heading text-3xl">Adults only</CardTitle>
          <CardDescription>Both confirmations are required to enter the studio.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <Checkbox
                checked={age}
                onCheckedChange={(value) => setAge(value === true)}
                className="mt-0.5 size-5"
              />
              <span className="text-sm leading-relaxed">I confirm I am 18+.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <Checkbox
                checked={fictional}
                onCheckedChange={(value) => setFictional(value === true)}
                className="mt-0.5 size-5"
              />
              <span className="text-sm leading-relaxed text-muted-foreground">
                I will only create fictional, clearly-adult subjects. I will not upload or imitate real
                people.
              </span>
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={!ready || pending} className="h-11 w-full rounded-full sm:flex-1">
                {pending ? "Saving…" : "Enter studio"}
              </Button>
              <Button asChild variant="outline" className="h-11 w-full rounded-full sm:w-auto">
                <a href="/">Leave</a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
