import { redirect } from "next/navigation";
import { PrivacyStrip } from "@/components/privacy-strip";
import { ensureSessionMatchesUser, getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/invite");
  }
  if (!user) redirect("/invite");
  await ensureSessionMatchesUser(user);
  if (!user.ageAttestedAt) redirect("/age");

  return (
    <div className="studio">
      <aside className="rail">
        <div className="kicker">Studio</div>
        <div className="wordmark">Cast</div>
        <nav>
          <a href="/app/characters">Characters</a>
          <a href="/app/create">Create</a>
          <a href="/app/library">Library</a>
          <a href="/app/jobs">Jobs</a>
          {user.role === "admin" ? <a href="/admin/invites">Admin</a> : null}
        </nav>
        <p className="muted">{user.email}</p>
      </aside>
      <div>
        <PrivacyStrip />
        <div className="canvas">{children}</div>
      </div>
    </div>
  );
}
