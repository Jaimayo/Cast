import { CheckIcon } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { soulStatusLabel } from "@/lib/soul";

export function SoulBadge(props: { name?: string; locked?: boolean; status?: string }) {
  const status = props.status
    ? soulStatusLabel(props.status)
    : props.locked
      ? "Locked"
      : "Draft";

  if (status === "Locked") {
    return (
      <StatusBadge
        status="success"
        leftLabel="Soul"
        rightLabel={props.name ?? "Locked"}
        rightIcon={<CheckIcon />}
        title="Locked Character Pack"
      />
    );
  }

  if (status === "Training") {
    return (
      <StatusBadge
        status="muted"
        className="animate-pulse"
        leftLabel="Soul"
        rightLabel="Training"
        title="Training Soul ID"
      />
    );
  }

  if (status === "Failed") {
    return <StatusBadge status="error" leftLabel="Soul" rightLabel="Failed" />;
  }

  return (
    <StatusBadge
      status="outline"
      leftLabel="Soul"
      rightLabel={props.locked === false && !props.status ? "Unset" : "Draft"}
    />
  );
}
