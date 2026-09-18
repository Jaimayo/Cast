"use client";

import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app/characters", label: "Characters" },
  { href: "/app/create", label: "Create" },
  { href: "/app/library", label: "Library" },
  { href: "/app/jobs", label: "Jobs" },
];

export function StudioNav(props: { admin?: boolean }) {
  const pathname = usePathname();
  return (
    <nav>
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <a key={link.href} href={link.href} className={active ? "active" : undefined}>
            {link.label}
          </a>
        );
      })}
      {props.admin ? (
        <a href="/admin/invites" className={pathname.startsWith("/admin") ? "active" : undefined}>
          Admin
        </a>
      ) : null}
    </nav>
  );
}
