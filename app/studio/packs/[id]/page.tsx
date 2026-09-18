"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/client";

type Ref = { id: string; kind: string; source: string; starterPresetId: string | null };
type Pack = { id: string; name: string; status: string };
type LibraryItem = { id: string; kind: string; storageKey: string };

export default function PackDetailPage() {
  const params = useParams<{ id: string }>();
  const packId = params.id;
  const [pack, setPack] = useState<Pack | null>(null);
  const [refs, setRefs] = useState<Ref[]>([]);
  const [refCount, setRefCount] = useState(0);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [mediaAssetId, setMediaAssetId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const data = await api<{ pack: Pack; refs: Ref[]; refCount: number }>(`/api/packs/${packId}`);
    const refData = await api<{ library: LibraryItem[] }>(`/api/packs/${packId}/refs`);
    setPack(data.pack);
    setRefs(data.refs);
    setRefCount(data.refCount);
    setLibrary(refData.library);
    setMediaAssetId(refData.library[0]?.id ?? "");
  }

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load pack");
    });
  }, [packId]);

  async function attach() {
    setError(null);
    try {
      await api(`/api/packs/${packId}/refs`, {
        method: "POST",
        body: JSON.stringify({ mediaAssetId, kind: "still" }),
      });
      setMessage("Attached in-app still as a training ref.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attach failed");
    }
  }

  async function lock() {
    setError(null);
    try {
      const result = await api<{ warning?: string | null }>(`/api/packs/${packId}/lock`, {
        method: "POST",
      });
      setMessage(result.warning ?? "Pack locked.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lock failed");
    }
  }

  async function train() {
    setError(null);
    try {
      const result = await api<{ job: { id: string } }>(`/api/packs/${packId}/train`, { method: "POST" });
      setMessage(`Queued trainPack job ${result.job.id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Train failed");
    }
  }

  if (!pack) {
    return <p className="muted">Loading pack…</p>;
  }

  return (
    <section>
      <div className="kicker">Character Pack</div>
      <h1>{pack.name}</h1>
      <p className="muted">
        Status: {pack.status} · refs {refCount}/20 (min 12)
      </p>
      <div className="banner">
        Face upload from a real person is intentionally omitted. Add generate-starters or in-app
        stills only.
      </div>
      <div className="actions">
        <button className="btn secondary" type="button" onClick={() => void lock()}>
          Lock pack
        </button>
        <button className="btn" type="button" onClick={() => void train()}>
          Train pack
        </button>
        <a className="btn secondary" href="/studio/starters">
          Generate starters
        </a>
      </div>
      {message ? <p className="ok">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <h3>Attach from in-app library</h3>
      {library.length === 0 ? (
        <p className="muted">No stills yet. Generate from Composer or Starters first.</p>
      ) : (
        <div className="row-between">
          <select value={mediaAssetId} onChange={(event) => setMediaAssetId(event.target.value)}>
            {library.map((item) => (
              <option key={item.id} value={item.id}>
                {item.kind} · {item.storageKey}
              </option>
            ))}
          </select>
          <button className="btn secondary" type="button" onClick={() => void attach()}>
            Attach ref
          </button>
        </div>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Source</th>
            <th>Starter</th>
          </tr>
        </thead>
        <tbody>
          {refs.map((ref) => (
            <tr key={ref.id}>
              <td>{ref.kind}</td>
              <td>{ref.source}</td>
              <td>{ref.starterPresetId ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
