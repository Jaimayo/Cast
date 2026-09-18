"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export function CharacterRequiredEmpty(props: {
  selectedPackId?: string;
  selectedPackLocked?: boolean;
  stubMode?: boolean;
  onDemoSeeded?: (packId: string) => void;
}) {
  const showLockLink = Boolean(props.selectedPackId) && !props.selectedPackLocked;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function seedDemo() {
    setPending(true);
    setError(null);
    try {
      const result = await api<{ locked: { id: string } }>("/api/packs/demo", { method: "POST" });
      props.onDemoSeeded?.(result.locked.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not seed demo pack");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="hero-frame empty-frame">
      <div className="empty-copy">
        <div className="kicker">Composer</div>
        <h2>Lock a character to create</h2>
        <p>Composer needs a Locked Soul ID.</p>
        <div className="actions">
          <a className="btn" href="/app/characters">
            Go to Characters
          </a>
          {showLockLink ? (
            <a className="btn secondary" href={`/app/characters/${props.selectedPackId}`}>
              Lock Soul ID first
            </a>
          ) : (
            <span className="muted empty-secondary">Lock Soul ID first</span>
          )}
        </div>
        {props.stubMode ? (
          <p className="stub-note">
            <button className="text-link" type="button" disabled={pending} onClick={() => void seedDemo()}>
              {pending ? "Seeding…" : "Seed a demo Locked pack"}
            </button>
            <span className="muted"> Stub mode only — for product review.</span>
          </p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </div>
  );
}
