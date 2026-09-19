"use client";

import { useEffect, useState } from "react";
import { RefCountMeter } from "@/components/ref-count-meter";
import { RefTray, type TrayRef } from "@/components/ref-tray";
import { DemoBadge, DemoPackBanner } from "@/components/demo-pack-banner";
import { SoulBadge } from "@/components/soul-badge";
import { api } from "@/lib/client";
import { PACK_REF_FICTIONAL_COPY } from "@/lib/pack-ref-upload";
import { isLockedSoul, soulStatusLabel } from "@/lib/soul";
import { TestGridPanel } from "@/components/test-grid-panel";
import { TEST_GRID_SIZE, type TestGridJob } from "@/lib/test-grid";

type Pack = {
  id: string;
  name: string;
  status: string;
  hasAdapter?: boolean;
  demo?: boolean;
  demoState?: "locked" | "draft";
};

export function PackStatusPanel(props: {
  pack: Pack;
  refCount: number;
  refs?: TrayRef[];
  initialGridJobs?: TestGridJob[];
}) {
  const [status, setStatus] = useState(props.pack.status);
  const [adapterReady, setAdapterReady] = useState(Boolean(props.pack.hasAdapter));
  const [pending, setPending] = useState<"test-grid" | "retrain" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gridJobs, setGridJobs] = useState<TestGridJob[]>(props.initialGridJobs ?? []);

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
      const result = await api<{ count: number; jobs: TestGridJob[] }>(`/api/packs/${props.pack.id}/test-grid`, {
        method: "POST",
      });
      setGridJobs(result.jobs ?? []);
      setMessage(`Queued ${result.count} identity stills at 3:4. Same path as Create → Generate.`);
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
    <section>
      <div className="kicker">Character Pack</div>
      <div className="row-between">
        <h1>{props.pack.name}</h1>
        <div className="roster-badges">
          {props.pack.demo ? <DemoBadge /> : null}
          <SoulBadge name={props.pack.name} locked={locked} />
        </div>
      </div>
      {props.pack.demo ? <DemoPackBanner state="locked" /> : null}
      <p className="muted">
        {soulStatusLabel(status)} · {props.refCount} reference pictures
      </p>
      <div className="banner">{PACK_REF_FICTIONAL_COPY} These stills train Soul ID — they are not a camera roll.</div>
      <RefCountMeter count={props.refCount} />
      <h3>Reference pictures</h3>
      <RefTray refs={props.refs ?? []} readOnly />
      {status === "training" ? <p className="ok">Training Soul ID…</p> : null}
      {adapterReady ? (
        <p className="ok">Identity adapter saved. Generate uses this Soul ID on stills.</p>
      ) : locked ? (
        <p className="muted">Locked without an adapter yet — Generate stills use the character name only.</p>
      ) : null}
      <p className="muted">
        Test grid queues {TEST_GRID_SIZE} stills (Create → Generate) so you can check identity. Retrain runs
        Train & lock again on the same refs.
      </p>
      {locked ? (
        <TestGridPanel
          packId={props.pack.id}
          packName={props.pack.name}
          jobs={gridJobs}
          pending={pending === "test-grid"}
          onJobs={setGridJobs}
        />
      ) : null}
      {message ? <p className="ok">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="actions">
        {locked ? (
          <a className="btn" href={`/app/create?pack=${props.pack.id}`}>
            Use in Create
          </a>
        ) : (
          <span className="muted">Lock Soul ID first — Generate stays off until this pack is Locked.</span>
        )}
        <button
          className="btn secondary"
          type="button"
          disabled={!locked || Boolean(pending)}
          title={locked ? "Queue a small set of identity stills" : "Lock Soul ID first"}
          onClick={() => void queueTestGrid()}
        >
          {pending === "test-grid" ? "Queueing…" : "Test grid"}
        </button>
        <button
          className="btn secondary"
          type="button"
          disabled={!locked || Boolean(pending) || Boolean(props.pack.demo)}
          title={
            props.pack.demo
              ? "Demo packs stay on placeholders — retrain on your own pack"
              : locked
                ? "Train again from the existing refs"
                : "Lock Soul ID first"
          }
          onClick={() => void retrain()}
        >
          {pending === "retrain" ? "Queueing…" : "Retrain"}
        </button>
      </div>
      {message && pending === null && locked ? (
        <p className="muted">
          <a href="/app/jobs">Open Jobs</a>
          {" · "}
          <a href={`/app/create?pack=${props.pack.id}`}>Open Create</a>
        </p>
      ) : null}
    </section>
  );
}
