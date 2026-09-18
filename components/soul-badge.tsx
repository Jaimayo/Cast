import { Badge } from "@/components/ui/badge";
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
      <Badge variant="success" className="rounded-full px-2.5" title="Locked Character Pack">
        Soul: {props.name ?? "Locked"} ✓
      </Badge>
    );
  }

  if (status === "Training") {
    return (
      <Badge
        variant="secondary"
        className="animate-pulse rounded-full px-2.5 text-muted-foreground"
        title="Training Soul ID"
      >
        Training
      </Badge>
    );
  }

  if (status === "Failed") {
    return (
      <Badge variant="destructive" className="rounded-full px-2.5">
        Failed
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 font-normal text-muted-foreground")}>
      {props.locked === false && !props.status ? "No Soul ID" : "Draft"}
    </Badge>
  );
}
