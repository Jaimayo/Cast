import { redirect } from "next/navigation";
import { CastShell } from "@/components/cast/cast-shell";
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
    <CastShell variant="studio" user={{ email: user.email, role: user.role }}>
      {children}
    </CastShell>
  );
}
