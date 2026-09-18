"use client";

import { usePathname } from "next/navigation";
import { Images, ListTodo, Shield, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/app/characters", label: "Characters", icon: Users },
  { href: "/app/create", label: "Create", icon: Sparkles },
  { href: "/app/library", label: "Library", icon: Images },
  { href: "/app/jobs", label: "Jobs", icon: ListTodo },
];

export function StudioNav(props: { admin?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <a
            key={link.href}
            href={link.href}
            className={cn(
              "cast-ease flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              active && "bg-sidebar-accent/70 text-foreground ring-1 ring-sidebar-border",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {link.label}
          </a>
        );
      })}
      {props.admin ? (
        <a
          href="/admin/invites"
          className={cn(
            "cast-ease flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            pathname.startsWith("/admin") && "bg-sidebar-accent/70 text-foreground ring-1 ring-sidebar-border",
          )}
        >
          <Shield className="size-4 shrink-0" aria-hidden />
          Admin
        </a>
      ) : null}
    </nav>
  );
}
