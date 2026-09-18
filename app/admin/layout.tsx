import { redirect } from "next/navigation";
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
  return <main className="wrap" style={{ padding: "40px 0 80px" }}>{children}</main>;
}
