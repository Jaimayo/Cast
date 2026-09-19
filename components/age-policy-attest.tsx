"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AGE_ATTEST_COPY, AGE_INCOMPLETE_MESSAGE } from "@/lib/age-attest";
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
      setError(AGE_INCOMPLETE_MESSAGE);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const data = await api<{ next?: "/app" | "/age" }>("/api/auth/age", {
        method: "POST",
        body: JSON.stringify({ attested: true, fictionalOnly: true }),
      });
      router.push(data.next ?? "/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attest");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="panel card">
      <div className="kicker">Age confirmation</div>
      <h1>Adults only</h1>
      <form onSubmit={onSubmit}>
        <label className="checkbox-row">
          <input type="checkbox" checked={age} onChange={(event) => setAge(event.target.checked)} />
          {AGE_ATTEST_COPY}
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
