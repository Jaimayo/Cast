import { cn } from "@/lib/utils";
import { soulStatusLabel } from "@/lib/soul";

export function SoulBadge(props: { name?: string; locked?: boolean; status?: string }) {
  const status = props.status
    ? soulStatusLabel(props.status)
    : props.locked
      ? "Locked"
      : "Draft";

  if (status === "Locked") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-success/35 bg-success/15 px-2.5 py-0.5 text-xs text-success",
        )}
        title="Locked Character Pack"
      >
        <span className="size-1.5 rounded-full bg-success" />
        Soul: {props.name ?? "Locked"}
      </span>
    );
  }

  if (status === "Training") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
        Training
      </span>
    );
  }

  if (status === "Failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-2.5 py-0.5 text-xs text-destructive">
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
      Draft
    </span>
  );
}

export function FictionalBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/25 px-2.5 py-0.5 text-[11px] tracking-[0.08em] text-primary uppercase">
      Fictional only
    </span>
  );
}
