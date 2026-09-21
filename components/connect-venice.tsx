"use client";

import { useEffect, useId, useState } from "react";
import { api } from "@/lib/client";
import {
  VENICE_API_SETTINGS_URL,
  VENICE_CONNECTED_PLACEHOLDER,
  VENICE_CONNECT_HELP,
  VENICE_CONNECT_TITLE,
  VENICE_DISCONNECT,
  VENICE_DISCONNECT_CONFIRM_BODY,
  VENICE_DISCONNECT_CONFIRM_TITLE,
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
  const confirmTitleId = useId();
  const [status, setStatus] = useState<VenicePublicStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
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

  const connected = status?.connected === true;
  const canSave = apiKey.trim().length > 0 && !pending;

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
      setShowKey(false);
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
      setShowKey(false);
      setConfirmDisconnect(false);
      setStatus(data.venice);
      setNotice(VENICE_DISCONNECT_SUCCESS);
    } catch (err) {
      setError(err instanceof Error ? err.message : VENICE_EMPTY);
    } finally {
      setPending(false);
    }
  }

  const [helpBefore, helpAfter] = VENICE_CONNECT_HELP.split("venice.ai/settings/api");

  return (
    <section className="connect-venice">
      <div className="kicker">Settings</div>
      <form onSubmit={(event) => void save(event)} className="card connect-venice-panel">
        <div className="connect-venice-head">
          <h1>{VENICE_CONNECT_TITLE}</h1>
          {status ? (
            <span className={connected ? "status-pill is-on" : "status-pill"}>{status.status}</span>
          ) : null}
        </div>

        <label htmlFor="venice-api-key">{VENICE_FIELD_LABEL}</label>
        <div className="venice-key-row">
          <input
            id="venice-api-key"
            name="venice-api-key"
            type={showKey ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={connected ? VENICE_CONNECTED_PLACEHOLDER : VENICE_FIELD_PLACEHOLDER}
          />
          <button
            className="btn secondary venice-reveal"
            type="button"
            onClick={() => setShowKey((open) => !open)}
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        {connected && status?.maskedKey && !apiKey ? (
          <p className="venice-masked">{status.maskedKey}</p>
        ) : null}

        <p className="muted venice-help">
          {helpBefore}
          <a href={VENICE_API_SETTINGS_URL} target="_blank" rel="noreferrer">
            venice.ai/settings/api
          </a>
          {helpAfter}
        </p>

        {error ? <p className="venice-error">{error}</p> : null}
        {notice ? <p className="venice-success">{notice}</p> : null}

        <div className="actions venice-actions">
          <button className="btn" type="submit" disabled={!canSave}>
            {pending && !confirmDisconnect ? <span className="btn-spinner" aria-hidden /> : null}
            {pending && !confirmDisconnect ? "Saving…" : VENICE_SAVE}
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
      </form>

      {confirmDisconnect ? (
        <div className="venice-dialog" role="presentation">
          <div
            className="card venice-dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
          >
            <h2 id={confirmTitleId}>{VENICE_DISCONNECT_CONFIRM_TITLE}</h2>
            <p className="muted">{VENICE_DISCONNECT_CONFIRM_BODY}</p>
            <div className="actions">
              <button className="btn danger" type="button" disabled={pending} onClick={() => void disconnect()}>
                {VENICE_DISCONNECT}
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
        </div>
      ) : null}
    </section>
  );
}
