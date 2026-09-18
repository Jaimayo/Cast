"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function AgePolicyAttest() {
  const router = useRouter();
  const [age, setAge] = useState(false);
  const [fictional, setFictional] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ready = age && fictional;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) {
      setError("Both confirmations are required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/age", {
        method: "POST",
        body: JSON.stringify({ attested: true, fictionalOnly: true }),
      });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attest");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="panel card gate-card age-card">
      <div className="kicker">Age confirmation</div>
      <h1>Adults only</h1>
      <p className="lede-sm">
        Studio chrome stays hidden until both confirmations are checked. This is a self-attest, not an
        ID scan.
      </p>
      <form onSubmit={onSubmit}>
        <label className="checkbox-row">
          <input type="checkbox" checked={age} onChange={(event) => setAge(event.target.checked)} />
          I confirm I am 18+.
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={fictional}
            onChange={(event) => setFictional(event.target.checked)}
          />
          I will only create fictional, clearly-adult subjects. I will not upload or imitate real
          people.
        </label>
        {error ? <p className="error">{error}</p> : null}
        <div className="actions">
          <button className="btn" type="submit" disabled={!ready || pending}>
            {pending ? "Saving…" : "Enter studio"}
          </button>
          <a className="btn secondary" href="/">
            Leave
          </a>
        </div>
      </form>
    </main>
  );
}
