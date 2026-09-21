"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import {
  VENICE_API_SETTINGS_URL,
  VENICE_CONNECT_TITLE,
  VENICE_DISCONNECT,
  VENICE_SAVE_KEY,
  type VenicePublicStatus,
} from "@/lib/venice-settings";

export function ConnectVenice() {
  const [status, setStatus] = useState<VenicePublicStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh() {
    const data = await api<{ venice: VenicePublicStatus }>("/api/admin/venice");
    setStatus(data.venice);
  }

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load Venice status");
    });
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const data = await api<{ venice: VenicePublicStatus }>("/api/admin/venice", {
        method: "POST",
        body: JSON.stringify({ apiKey }),
      });
      setApiKey("");
      setStatus(data.venice);
      setNotice(
        data.venice.generateStillUsesVenice
          ? "Venice key saved. Generate uses Venice on this live server."
          : "Venice key saved. Generate stays on stub until PROVIDER_MODE=live.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the Venice key");
    } finally {
      setPending(false);
    }
  }

  async function disconnect() {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const data = await api<{ venice: VenicePublicStatus }>("/api/admin/venice", {
        method: "DELETE",
      });
      setApiKey("");
      setStatus(data.venice);
      setNotice("Venice disconnected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect Venice");
    } finally {
      setPending(false);
    }
  }

  const connected = status?.connected === true;

  return (
    <section className="connect-venice">
      <div className="kicker">Settings</div>
      <div className="row-between">
        <h1>{VENICE_CONNECT_TITLE}</h1>
        {status ? (
          <span className={connected ? "status-pill is-on" : "status-pill"}>{status.status}</span>
        ) : null}
      </div>
      <p className="muted">
        Create an API key at{" "}
        <a href={VENICE_API_SETTINGS_URL} target="_blank" rel="noreferrer">
          venice.ai/settings/api
        </a>. Cast stores it on the server — it never appears in the browser after you save.
      </p>
      {status?.maskedKey ? <p className="venice-masked">Key {status.maskedKey}</p> : null}
      <form onSubmit={(event) => void save(event)} className="card">
        <label htmlFor="venice-api-key">API key</label>
        <input
          id="venice-api-key"
          name="venice-api-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={connected ? "Enter a new key to replace" : "Paste your Venice API key"}
        />
        <div className="actions" style={{ marginTop: 8 }}>
          <button className="btn" type="submit" disabled={pending || !apiKey.trim()}>
            {pending ? "Saving…" : VENICE_SAVE_KEY}
          </button>
          <button
            className="btn secondary"
            type="button"
            disabled={pending || !connected}
            onClick={() => void disconnect()}
          >
            {VENICE_DISCONNECT}
          </button>
        </div>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="ok">{notice}</p> : null}
    </section>
  );
}
