"use client";

import { usePathname } from "next/navigation";
import { StudioNav } from "@/components/studio-nav";
import { StudioTopbar } from "@/components/studio-topbar";
import { Separator } from "@/components/ui/separator";

export function CastShell(props: {
  email: string;
  admin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const flush = pathname.startsWith("/app/create");

  return (
    <div className="cast-void min-h-svh lg:grid lg:grid-cols-[15.25rem_minmax(0,1fr)]">
      <aside className="border-b border-sidebar-border bg-sidebar lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 px-4 py-4 lg:h-full lg:flex-col lg:items-stretch lg:px-4 lg:py-6">
          <div>
            <p className="text-[11px] tracking-[0.18em] text-primary uppercase">Studio</p>
            <a href="/app/characters" className="font-heading text-2xl tracking-tight">
              Cast
            </a>
          </div>
          <StudioNav admin={props.admin} />
          <div className="hidden lg:mt-auto lg:block">
            <Separator className="mb-4" />
            <p className="break-all font-mono text-[11px] leading-snug text-muted-foreground">{props.email}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">Fictional adults only</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0 p-3 lg:p-4">
        <div className="cast-surface flex min-h-[calc(100svh-1.5rem)] flex-col overflow-hidden rounded-xl lg:min-h-[calc(100svh-2rem)]">
          <StudioTopbar />
            <div className={flush ? "flex min-h-0 min-w-0 flex-1 flex-col" : "min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-7"}>{props.children}</div>
        </div>
      </div>
    </div>
  );
}
