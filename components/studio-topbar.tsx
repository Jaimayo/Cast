"use client";

import { usePathname } from "next/navigation";
import { CreditsLater, PrivacyBadge } from "@/components/privacy-badge";

export function StudioTopbar() {
  const pathname = usePathname();
  if (pathname.startsWith("/app/create")) {
    return null;
  }
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3 lg:px-7">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Private studio</p>
      <div className="flex items-center gap-2">
        <PrivacyBadge />
        <CreditsLater />
      </div>
    </div>
  );
}
