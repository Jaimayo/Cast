"use client";

import { useState } from "react";
import { packSwatch } from "@/lib/chip-visuals";
import { SoulBadge } from "@/components/soul-badge";
import { api } from "@/lib/client";
import { isLockedSoul, soulStatusLabel } from "@/lib/soul";

type Pack = { id: string; name: string; status: string; refCount?: number };

export function CharacterRoster(props: { packs: Pack[]; stubMode?: boolean }) {
  const [packs, setPacks] = useState(props.packs);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function seedDemo() {
    setPending(true);
    setError(null);
    try {
      const result = await api<{ packs: Pack[] }>("/api/packs/demo", { method: "POST" });
      const listed = await api<{ packs: Pack[] }>("/api/packs");
      setPacks(listed.packs);
      void result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not seed demo pack");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {props.stubMode ? (
        <div className="banner demo-banner">
          Stub mode: seed a Locked pack so Create is reviewable without training.
          <button className="btn secondary" type="button" disabled={pending} onClick={() => void seedDemo()}>
            {pending ? "Seeding…" : "Seed demo Locked pack"}
          </button>
        </div>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="roster-grid">
        <a className="card roster-card create-card" href="/app/characters/new">
          <div className="roster-thumb create-thumb">+</div>
          <div className="kicker">New</div>
          <h3>Create pack</h3>
          <p className="muted">Starters or library stills. Fictional only.</p>
        </a>
        {packs.map((pack) => {
          const locked = isLockedSoul(pack.status);
          const refs = pack.refCount ?? 0;
          const swatch = packSwatch(pack.id);
          return (
            <div key={pack.id} className="card roster-card">
              <a href={`/app/characters/${pack.id}`}>
                <div
                  className="roster-thumb"
                  style={{ background: `linear-gradient(152deg, ${swatch.from}, ${swatch.to})` }}
                >
                  <span>{pack.name.slice(0, 1).toUpperCase()}</span>
                </div>
                <h3>{pack.name}</h3>
                <p className="muted">
                  {soulStatusLabel(pack.status)} · {refs} refs
                </p>
              </a>
              {locked ? <SoulBadge name={pack.name} locked /> : <span className="fictional-badge">Fictional only</span>}
              {locked ? (
                <a className="btn secondary" href={`/app/create?pack=${pack.id}`}>
                  Use in Create
                </a>
              ) : (
                <a className="btn secondary" href={`/app/characters/${pack.id}`}>
                  Lock Soul ID first
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
