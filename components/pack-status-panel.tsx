"use client";

import { useEffect, useState } from "react";
import { SoulBadge } from "@/components/soul-badge";
import { api } from "@/lib/client";
import { isLockedSoul, soulStatusLabel } from "@/lib/soul";
import { TEST_GRID_SIZE } from "@/lib/test-grid";
import { Button } from "@/components/ui/button";
import { MetallicButton } from "@/components/metallic-button";

type Pack = {
  id: string;
  name: string;
  status: string;
  hasAdapter?: boolean;
};

export function PackStatusPanel(props: { pack: Pack; refCount: number }) {
  const [status, setStatus] = useState(props.pack.status);
  const [adapterReady, setAdapterReady] = useState(Boolean(props.pack.hasAdapter));
  const [pending, setPending] = useState<"test-grid" | "retrain" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "training") return;
    const timer = window.setInterval(() => {
      void api<{ pack: Pack }>(`/api/packs/${props.pack.id}`).then((data) => {
        setStatus(data.pack.status);
        setAdapterReady(Boolean(data.pack.hasAdapter));
        if (data.pack.status === "locked" || data.pack.status === "ready" || data.pack.status === "failed") {
          window.location.reload();
        }
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [props.pack.id, status]);

  const locked = isLockedSoul(status);

  async function queueTestGrid() {
    if (!locked || pending) return;
    setPending("test-grid");
    setError(null);
    setMessage(null);
    try {
      const result = await api<{ count: number }>(`/api/packs/${props.pack.id}/test-grid`, { method: "POST" });
      setMessage(`Queued ${result.count} identity stills. Same path as Create → Generate.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test grid failed");
    } finally {
      setPending(null);
    }
  }

  async function retrain() {
    if (!locked || pending) return;
    setPending("retrain");
    setError(null);
    setMessage(null);
    try {
      await api<{ job: { id: string } }>(`/api/packs/${props.pack.id}/retrain`, { method: "POST" });
      setStatus("training");
      setMessage("Retrain queued with the existing refs.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retrain failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <p className="text-[11px] tracking-[0.16em] text-primary uppercase">Character Pack</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl">{props.pack.name}</h1>
        <SoulBadge name={props.pack.name} locked={locked} status={status} />
      </div>
      <p className="font-mono text-sm text-muted-foreground">
        {soulStatusLabel(status)} · refs {props.refCount}/20
      </p>
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Face upload from a real person is intentionally omitted.
      </div>
      {status === "training" ? (
        <div className="space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/80" />
          </div>
          <p className="text-sm text-success">Training Soul ID…</p>
        </div>
      ) : null}
      {adapterReady ? (
        <p className="text-sm text-success">Identity adapter saved. Generate uses this Soul ID on stills.</p>
      ) : locked ? (
        <p className="text-sm text-muted-foreground">
          Locked without an adapter yet — Generate stills use the character name only.
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Test grid queues {TEST_GRID_SIZE} stills (Create → Generate) so you can check identity. Retrain runs
        Train & lock again on the same refs.
      </p>
      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {locked ? (
          <MetallicButton asChild>
            <a href={`/app/create?pack=${props.pack.id}`}>Use in Create</a>
          </MetallicButton>
        ) : (
          <span className="text-sm text-muted-foreground">
            Lock Soul ID first — Generate stays off until this pack is Locked.
          </span>
        )}
        <Button
          variant="outline"
          type="button"
          className="rounded-full"
          disabled={!locked || Boolean(pending)}
          title={locked ? "Queue a small set of identity stills" : "Lock Soul ID first"}
          onClick={() => void queueTestGrid()}
        >
          {pending === "test-grid" ? "Queueing…" : "Test grid"}
        </Button>
        <Button
          variant="outline"
          type="button"
          className="rounded-full"
          disabled={!locked || Boolean(pending)}
          title={locked ? "Train again from the existing refs" : "Lock Soul ID first"}
          onClick={() => void retrain()}
        >
          {pending === "retrain" ? "Queueing…" : "Retrain"}
        </Button>
      </div>
      {message && pending === null && locked ? (
        <p className="text-sm text-muted-foreground">
          <a href="/app/jobs" className="text-primary underline-offset-4 hover:underline">
            Open Jobs
          </a>
          {" · "}
          <a href={`/app/create?pack=${props.pack.id}`} className="text-primary underline-offset-4 hover:underline">
            Open Create
          </a>
        </p>
      ) : null}
    </section>
  );
}
