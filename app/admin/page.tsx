import { ConnectVenicePanel } from "@/components/connect-venice";

export default function AdminSettingsPage() {
  return (
    <section>
      <ConnectVenicePanel />
      <p className="muted" style={{ marginTop: 28 }}>
        <a href="/admin/invites">Invite codes</a>
      </p>
    </section>
  );
}
