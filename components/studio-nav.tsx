"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/app/characters", label: "Characters" },
  { href: "/app/create", label: "Create" },
  { href: "/app/library", label: "Library" },
  { href: "/app/jobs", label: "Jobs" },
];

export function StudioNav(props: { admin?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <a
            key={link.href}
            href={link.href}
            className={cn(
              "cast-ease rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground",
            )}
          >
            {link.label}
          </a>
        );
      })}
      {props.admin ? (
        <a
          href="/admin/invites"
          className={cn(
            "cast-ease rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
            pathname.startsWith("/admin") && "bg-muted text-foreground",
          )}
        >
          Admin
        </a>
      ) : null}
    </nav>
  );
}
