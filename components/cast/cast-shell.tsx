"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CreditsLater } from "@/components/cast/credits-later";
import { PrivacyBadge } from "@/components/cast/privacy-badge";
import { VoidAtmosphere } from "@/components/cast/void-atmosphere";
import { Wordmark } from "@/components/cast/wordmark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app/characters", label: "Characters" },
  { href: "/app/create", label: "Create" },
  { href: "/app/library", label: "Library" },
  { href: "/app/jobs", label: "Jobs" },
];

function StudioNav(props: { admin?: boolean }) {
  const pathname = usePathname();
  const links = props.admin ? [...NAV, { href: "/admin/invites", label: "Admin" }] : NAV;

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <a
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground",
              active && "bg-muted text-foreground",
            )}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}

export function CastShell(props: {
  variant: "gate" | "studio";
  user?: { email: string; role: string };
  children: ReactNode;
}) {
  if (props.variant === "gate") {
    return (
      <div className="relative min-h-dvh bg-background">
        <VoidAtmosphere />
        <div className="relative z-10">{props.children}</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-background">
      <VoidAtmosphere subtle />
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Wordmark href="/app/characters" size="sm" />
          <StudioNav admin={props.user?.role === "admin"} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PrivacyBadge />
          <CreditsLater />
        </div>
      </header>
      <div className="relative z-10">{props.children}</div>
    </div>
  );
}
