"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client";

type Invite = {
  id: string;
  code: string;
  note: string | null;
  maxUses: number;
  useCount: number;
  revokedAt: string | null;
  expiresAt: string | null;
};

function inviteState(invite: Invite): string {
  if (invite.revokedAt) {
    return "revoked";
  }
  if (invite.expiresAt && Date.parse(invite.expiresAt) <= Date.now()) {
    return "expired";
  }
  return invite.note ?? "";
}

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
    <section className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Admin v1</p>
      <h1 className="mt-1 font-heading text-4xl">Invite codes</h1>
      <Card className="cast-surface mt-6 border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Create invite</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void createInvite(event)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
            <Button type="submit" size="xl" variant="metallic">
              Create invite
            </Button>
          </form>
        </CardContent>
      </Card>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Uses</th>
              <th className="px-3 py-2 font-medium">Note</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <code className="font-mono text-xs tracking-[0.12em]">{invite.code}</code>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {invite.useCount}/{invite.maxUses}
                </td>
                <td className="px-3 py-2">{inviteState(invite)}</td>
                <td className="px-3 py-2 text-right">
                  {invite.revokedAt ? null : (
                    <Button variant="outline" type="button" onClick={() => void revoke(invite.id)}>
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
