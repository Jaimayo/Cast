"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Pack = { id: string; name: string; status: string };
type Preset = { id: string; kind: string; label: string };

export default function StartersPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [catalog, setCatalog] = useState<{ face: Preset[]; body: Preset[] } | null>(null);
  const [characterPackId, setCharacterPackId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      api<{ packs: Pack[] }>("/api/packs"),
      api<{ face: Preset[]; body: Preset[] }>("/api/generate-starters/catalog"),
    ]).then(([packData, catalogData]) => {
      setPacks(packData.packs);
      setCatalog(catalogData);
      setCharacterPackId(packData.packs[0]?.id ?? "");
    });
  }, []);

  async function run(presetId: string) {
    setError(null);
    setMessage(null);
    try {
      const result = await api<{ job: { id: string }; preset: Preset }>("/api/generate-starters", {
        method: "POST",
        body: JSON.stringify({ characterPackId, presetId }),
      });
      setMessage(`Queued ${result.preset.kind} starter ${result.preset.label} → ${result.job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Starter failed");
    }
  }

  if (!catalog) {
    return <p className="muted">Loading starters…</p>;
  }

  return (
    <section>
      <div className="kicker">Path 1</div>
      <h1>Generate-starters</h1>
      <p className="muted">
        Face and body vibes are a separate API from Composer. Results attach as TrainingSetAssets,
        not Composer templates.
      </p>
      <label htmlFor="pack">Draft Character Pack</label>
      <select
        id="pack"
        value={characterPackId}
        onChange={(event) => setCharacterPackId(event.target.value)}
      >
        {packs.map((pack) => (
          <option key={pack.id} value={pack.id}>
            {pack.name} · {pack.status}
          </option>
        ))}
      </select>
      {message ? <p className="ok">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <h3>Face vibes</h3>
      <div className="chips">
        {catalog.face.map((preset) => (
          <button key={preset.id} className="chip" type="button" onClick={() => void run(preset.id)}>
            {preset.label}
          </button>
        ))}
      </div>
      <h3>Body vibes</h3>
      <div className="chips">
        {catalog.body.map((preset) => (
          <button key={preset.id} className="chip" type="button" onClick={() => void run(preset.id)}>
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}
