import { redirect } from "next/navigation";
import { StudioNav } from "@/components/studio-nav";
import { StudioTopbar } from "@/components/studio-topbar";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/invite");
  }
  if (!user) redirect("/invite");
  if (!user.ageAttestedAt) redirect("/age");

  return (
    <div className="studio">
      <aside className="rail">
        <div className="kicker">Studio</div>
        <div className="wordmark">Cast</div>
        <StudioNav admin={user.role === "admin"} />
        <div className="rail-foot">
          <p className="muted">{user.email}</p>
          <p className="muted rail-note">Fictional adults only</p>
        </div>
      </aside>
      <div className="studio-main">
        <StudioTopbar />
        <div className="canvas">{children}</div>
      </div>
    </div>
  );
}
