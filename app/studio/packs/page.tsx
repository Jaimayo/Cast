"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Pack = { id: string; name: string; status: string; origin: string };

export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState<"generate_then_lock" | "library_train">("generate_then_lock");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const data = await api<{ packs: Pack[] }>("/api/packs");
    setPacks(data.packs);
  }

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load packs");
    });
  }, []);

  async function createPack(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api("/api/packs", {
        method: "POST",
        body: JSON.stringify({ name, origin }),
      });
      setName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create pack");
    }
  }

  return (
    <section>
      <div className="kicker">Soul ID</div>
      <h1>Character Packs</h1>
      <p className="muted">
        Fictional characters only. Attach 12–20 in-app stills or generate-starter refs, then lock and
        train via RunPod+Comfy. There is no real-person upload path.
      </p>
      <form onSubmit={(event) => void createPack(event)} className="card">
        <label htmlFor="name">Pack name</label>
        <input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        <label htmlFor="origin">Origin</label>
        <select
          id="origin"
          value={origin}
          onChange={(event) => setOrigin(event.target.value as typeof origin)}
        >
          <option value="generate_then_lock">Generate then lock</option>
          <option value="library_train">Library-train from in-app stills</option>
        </select>
        <button className="btn" type="submit">
          Create pack
        </button>
        {error ? <p className="error">{error}</p> : null}
      </form>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Origin</th>
          </tr>
        </thead>
        <tbody>
          {packs.map((pack) => (
            <tr key={pack.id}>
              <td>
                <a href={`/studio/packs/${pack.id}`}>{pack.name}</a>
              </td>
              <td>{pack.status}</td>
              <td>{pack.origin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
