"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <section className="space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.16em] text-primary uppercase">Admin v1</p>
        <h1 className="font-heading text-3xl">Invite codes</h1>
      </div>
      <Card className="cast-surface max-w-lg rounded-xl ring-border">
        <CardHeader>
          <CardTitle className="text-base">Create invite</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void createInvite(event)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="note" className="text-muted-foreground">
                Note
              </Label>
              <Input id="note" value={note} onChange={(event) => setNote(event.target.value)} className="h-11 rounded-xl" />
            </div>
            <Button type="submit" className="h-11 rounded-full">
              Create invite
            </Button>
          </form>
        </CardContent>
      </Card>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl ring-1 ring-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Uses</th>
              <th className="px-3 py-2 font-medium">Note</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <code className="font-mono text-xs">{invite.code}</code>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {invite.useCount}/{invite.maxUses}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{inviteState(invite)}</td>
                <td className="px-3 py-2">
                  {invite.revokedAt ? null : (
                    <Button variant="outline" type="button" className="rounded-full" onClick={() => void revoke(invite.id)}>
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
