"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Invite = {
  id: string;
  code: string;
  note: string | null;
  maxUses: number;
  useCount: number;
  revokedAt: string | null;
};

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const data = await api<{ invites: Invite[] }>("/api/admin/invites");
    setInvites(data.invites);
  }

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Admin load failed");
    });
  }, []);

  async function createInvite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api("/api/admin/invites", {
        method: "POST",
        body: JSON.stringify({ note, maxUses: 1 }),
      });
      setNote("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      await api(`/api/admin/invites/${id}/revoke`, { method: "POST" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    }
  }

  return (
    <section>
      <div className="kicker">Admin v1</div>
      <h1>Invite codes</h1>
      <form onSubmit={(event) => void createInvite(event)} className="card">
        <label htmlFor="note">Note</label>
        <input id="note" value={note} onChange={(event) => setNote(event.target.value)} />
        <button className="btn" type="submit">
          Create invite
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Uses</th>
            <th>Note</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.id}>
              <td>
                <code>{invite.code}</code>
              </td>
              <td>
                {invite.useCount}/{invite.maxUses}
              </td>
              <td>{invite.revokedAt ? "revoked" : invite.note}</td>
              <td>
                {invite.revokedAt ? null : (
                  <button className="btn secondary" type="button" onClick={() => void revoke(invite.id)}>
                    Revoke
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
