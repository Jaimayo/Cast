"use client";

import { useEffect, useState } from "react";
import { SoulBadge } from "@/components/soul-badge";
import { api } from "@/lib/client";
import { isLockedSoul, soulStatusLabel } from "@/lib/soul";

type Pack = {
  id: string;
  name: string;
  status: string;
  adapterStorageKey?: string | null;
};

export function PackStatusPanel(props: { pack: Pack; refCount: number }) {
  const [status, setStatus] = useState(props.pack.status);
  const [adapterReady, setAdapterReady] = useState(Boolean(props.pack.adapterStorageKey));

  useEffect(() => {
    if (status !== "training") return;
    const timer = window.setInterval(() => {
      void api<{ pack: Pack }>(`/api/packs/${props.pack.id}`).then((data) => {
        setStatus(data.pack.status);
        setAdapterReady(Boolean(data.pack.adapterStorageKey));
        if (data.pack.status === "locked" || data.pack.status === "ready" || data.pack.status === "failed") {
          window.location.reload();
        }
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [props.pack.id, status]);

  const locked = isLockedSoul(status);

  return (
    <section>
      <div className="kicker">Character Pack</div>
      <div className="row-between">
        <h1>{props.pack.name}</h1>
        <SoulBadge name={props.pack.name} locked={locked} />
      </div>
      <p className="muted">
        {soulStatusLabel(status)} · refs {props.refCount}/20
      </p>
      <div className="banner">Face upload from a real person is intentionally omitted.</div>
      {status === "training" ? <p className="ok">Training Soul ID… Generate unlocks when this pack is Locked.</p> : null}
      {adapterReady ? <p className="ok">Identity adapter saved. Create can use this Soul ID.</p> : null}
      <div className="actions">
        {locked ? (
          <a className="btn" href={`/app/create?pack=${props.pack.id}`}>
            Use in Create
          </a>
        ) : (
          <span className="muted">Generate unlocks when this pack is Locked.</span>
        )}
        <button className="btn secondary" type="button" disabled title="Later">
          Test grid
        </button>
        <button className="btn secondary" type="button" disabled title="Later">
          Retrain
        </button>
      </div>
    </section>
  );
}
