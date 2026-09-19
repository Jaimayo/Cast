"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CreditsLater } from "@/components/cast/credits-later";
import { PrivacyBadge } from "@/components/cast/privacy-badge";
import { VoidAtmosphere } from "@/components/cast/void-atmosphere";
import { Wordmark } from "@/components/cast/wordmark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Clapperboard, Images, ListTodo, Menu, Sparkles, Users } from "lucide-react";

const NAV = [
  { href: "/app/characters", label: "Characters", icon: Users },
  { href: "/app/create", label: "Create", icon: Sparkles },
  { href: "/app/library", label: "Library", icon: Images },
  { href: "/app/jobs", label: "Jobs", icon: ListTodo },
];

function NavLinks(props: { admin?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const links = props.admin
    ? [...NAV, { href: "/admin/invites", label: "Admin", icon: Clapperboard }]
    : NAV;

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <a
            key={link.href}
            href={link.href}
            onClick={props.onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors duration-200 ease-out hover:bg-sidebar-accent hover:text-foreground",
              active && "bg-sidebar-accent text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}

function SidebarChrome(props: { admin?: boolean; email?: string }) {
  return (
    <>
      <div className="px-3 pt-5 pb-4">
        <Wordmark href="/app/characters" size="sm" />
      </div>
      <div className="flex-1 px-2">
        <NavLinks admin={props.admin} />
      </div>
      <div className="space-y-2 border-t border-sidebar-border px-3 py-4">
        <PrivacyBadge />
        <CreditsLater />
        {props.email ? (
          <p className="truncate pt-1 font-mono text-[11px] text-muted-foreground">{props.email}</p>
        ) : null}
      </div>
    </>
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

  const admin = props.user?.role === "admin";

  return (
    <div className="relative min-h-dvh bg-background">
      <VoidAtmosphere subtle />
      <div className="relative z-10 flex min-h-dvh">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/90 md:flex">
          <SidebarChrome admin={admin} email={props.user?.email} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-md md:hidden">
            <Wordmark href="/app/characters" size="sm" variant="w1" />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open studio menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Studio</SheetTitle>
                </SheetHeader>
                <div className="flex h-full flex-col">
                  <SidebarChrome admin={admin} email={props.user?.email} />
                </div>
              </SheetContent>
            </Sheet>
          </header>
          <div className="min-h-0 flex-1">{props.children}</div>
        </div>
      </div>
    </div>
  );
}
