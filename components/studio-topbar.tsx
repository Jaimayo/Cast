"use client";

import { usePathname } from "next/navigation";
import { CreditsLater, PrivacyBadge } from "@/components/privacy-badge";

export function StudioTopbar() {
  const pathname = usePathname();
  if (pathname.startsWith("/app/create")) {
    return null;
  }
  return (
    <div className="studio-topbar">
      <span className="muted topbar-kicker">Private studio</span>
      <div className="header-right">
        <PrivacyBadge />
        <CreditsLater />
      </div>
    </div>
  );
}
