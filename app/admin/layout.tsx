import { redirect } from "next/navigation";
import { StudioChrome } from "@/components/studio-chrome";
import { ensureSessionMatchesUser, getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/invite");
  }
  if (!user) redirect("/invite");
  await ensureSessionMatchesUser(user);
  if (!user.ageAttestedAt) redirect("/age");
  if (user.role !== "admin") redirect("/app");
  return (
    <StudioChrome email={user.email} admin>
      {children}
    </StudioChrome>
  );
}
