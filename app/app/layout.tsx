import { redirect } from "next/navigation";
import { StudioChrome } from "@/components/studio-chrome";
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
    <StudioChrome email={user.email} admin={user.role === "admin"}>
      {children}
    </StudioChrome>
  );
}
