import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Consent/auth card with a dotted overlay — Serafim dotted-dialog, retokened. */
export function DottedSurface(props: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "cast-surface relative overflow-hidden rounded-xl border border-border bg-card/90",
        props.className,
      )}
    >
      <div className="cast-dots pointer-events-none absolute inset-0 opacity-[0.28]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-background/20 via-transparent to-background/50" />
      <div className="relative z-10">{props.children}</div>
    </div>
  );
}
