import { StatusBadge } from "@/components/cast/status-badge";
import { soulStatusLabel } from "@/lib/soul";

export function SoulBadge(props: { name?: string; locked?: boolean; status?: string }) {
  const status = props.status
    ? soulStatusLabel(props.status)
    : props.locked
      ? "Locked"
      : null;

  if (!status) {
    return <StatusBadge left="Soul" right="No ID" status="muted" />;
  }

  if (status === "Locked") {
    return (
      <span title="Locked Character Pack">
        <StatusBadge left="Soul" right={props.name ?? "Locked"} status="success" />
      </span>
    );
  }

  if (status === "Training") {
    return <StatusBadge left="Soul" right="Training" status="warning" pulse />;
  }

  if (status === "Failed") {
    return <StatusBadge left="Soul" right="Failed" status="error" />;
  }

  return <StatusBadge left="Soul" right="Draft" status="muted" />;
}

export function FictionalBadge() {
  return <StatusBadge left="Policy" right="Fictional" status="warning" />;
}
