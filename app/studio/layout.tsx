import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/invite");
  }

  if (!user) {
    redirect("/invite");
  }
  if (!user.ageAttestedAt) {
    redirect("/age");
  }

  return (
    <div className="studio">
      <aside className="rail">
        <div className="kicker">Studio</div>
        <div className="wordmark">Cast</div>
        <nav>
          <a href="/studio">Home</a>
          <a href="/studio/composer">Create</a>
          <a href="/studio/packs">Characters</a>
          <a href="/studio/starters">Starters</a>
          <a href="/studio/jobs">Jobs</a>
          {user.role === "admin" ? <a href="/admin/invites">Admin</a> : null}
        </nav>
        <p className="muted">{user.email}</p>
      </aside>
      <div>
        <div className="canvas">{children}</div>
        <div className="job-bar">Jobs run in the worker process · Redis + BullMQ · stills only</div>
      </div>
    </div>
  );
}
