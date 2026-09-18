"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function AgeGatePage() {
  const router = useRouter();
  const [age, setAge] = useState(false);
  const [fictional, setFictional] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!age || !fictional) {
      setError("Both attestations are required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/age", {
        method: "POST",
        body: JSON.stringify({ attested: true, fictionalOnly: true }),
      });
      router.push("/studio");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attest");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="panel card">
      <div className="kicker">Age gate</div>
      <h1>Adults only</h1>
      <p className="muted">
        Studio access requires a self-attestation. Depicted subjects must be wholly fictional and
        clearly adult. Real-person face upload and deepfake NSFW paths are not part of Cast.
      </p>
      <form onSubmit={onSubmit}>
        <label>
          <input type="checkbox" checked={age} onChange={(event) => setAge(event.target.checked)} /> I
          am at least 18 years old.
        </label>
        <label>
          <input
            type="checkbox"
            checked={fictional}
            onChange={(event) => setFictional(event.target.checked)}
          />{" "}
          I will only create fictional adult characters (21+ appearance) and will not impersonate
          real people.
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Enter studio"}
        </button>
      </form>
    </main>
  );
}
