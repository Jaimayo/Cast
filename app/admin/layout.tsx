import { redirect } from "next/navigation";
import { ensureSessionMatchesUser, getCurrentUser } from "@/server/auth";
import { VoidAtmosphere } from "@/components/void-atmosphere";

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
    <VoidAtmosphere>
      <div className="mx-auto max-w-4xl px-5 py-10">{children}</div>
    </VoidAtmosphere>
  );
}
