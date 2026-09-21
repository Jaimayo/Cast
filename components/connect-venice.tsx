"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import {
  VENICE_API_SETTINGS_URL,
  VENICE_CONNECT_HELP,
  VENICE_CONNECT_TITLE,
  VENICE_DISCONNECT,
  VENICE_DISCONNECT_CONFIRM,
  VENICE_DISCONNECT_SUCCESS,
  VENICE_EMPTY,
  VENICE_FIELD_LABEL,
  VENICE_FIELD_PLACEHOLDER,
  VENICE_KEEP_CONNECTED,
  VENICE_SAVE,
  VENICE_SAVE_SUCCESS,
  type VenicePublicStatus,
} from "@/lib/venice-settings";

export function ConnectVenicePanel() {
  const [status, setStatus] = useState<VenicePublicStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  async function refresh() {
    const data = await api<{ venice: VenicePublicStatus }>("/api/admin/venice");
    setStatus(data.venice);
  }

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : VENICE_EMPTY);
    });
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setConfirmDisconnect(false);
    if (!apiKey.trim()) {
      setError(VENICE_EMPTY);
      setNotice(null);
      return;
    }
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
      setNotice(VENICE_SAVE_SUCCESS);
    } catch (err) {
      setError(err instanceof Error ? err.message : VENICE_EMPTY);
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
      setConfirmDisconnect(false);
      setStatus(data.venice);
      setNotice(VENICE_DISCONNECT_SUCCESS);
    } catch (err) {
      setError(err instanceof Error ? err.message : VENICE_EMPTY);
    } finally {
      setPending(false);
    }
  }

  const connected = status?.connected === true;

  return (
    <section className="connect-venice">
      <div className="kicker">Settings</div>
      <form onSubmit={(event) => void save(event)} className="card connect-venice-panel">
        <div className="row-between">
          <h1>{VENICE_CONNECT_TITLE}</h1>
          {status ? (
            <span className={connected ? "status-pill is-on" : "status-pill"}>{status.status}</span>
          ) : null}
        </div>
        <p className="muted venice-help">
          {VENICE_CONNECT_HELP.split("venice.ai/settings/api")[0]}
          <a href={VENICE_API_SETTINGS_URL} target="_blank" rel="noreferrer">
            venice.ai/settings/api
          </a>
          {VENICE_CONNECT_HELP.split("venice.ai/settings/api")[1]}
        </p>
        {connected && status?.maskedKey ? <p className="venice-masked">Key {status.maskedKey}</p> : null}
        {!connected ? <p className="muted venice-empty">{VENICE_EMPTY}</p> : null}
        <label htmlFor="venice-api-key">{VENICE_FIELD_LABEL}</label>
        <input
          id="venice-api-key"
          name="venice-api-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={VENICE_FIELD_PLACEHOLDER}
        />
        {confirmDisconnect ? (
          <div className="venice-confirm">
            <p className="muted">{VENICE_DISCONNECT_CONFIRM}</p>
            <div className="actions" style={{ marginTop: 8 }}>
              <button className="btn" type="button" disabled={pending} onClick={() => void disconnect()}>
                {pending ? "Saving…" : VENICE_DISCONNECT}
              </button>
              <button
                className="btn secondary"
                type="button"
                disabled={pending}
                onClick={() => setConfirmDisconnect(false)}
              >
                {VENICE_KEEP_CONNECTED}
              </button>
            </div>
          </div>
        ) : (
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="btn" type="submit" disabled={pending}>
              {pending ? "Saving…" : VENICE_SAVE}
            </button>
            {connected ? (
              <button
                className="btn secondary"
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setConfirmDisconnect(true);
                }}
              >
                {VENICE_DISCONNECT}
              </button>
            ) : null}
          </div>
        )}
        {error ? <p className="error venice-error">{error}</p> : null}
        {notice ? <p className="ok">{notice}</p> : null}
      </form>
    </section>
  );
}
