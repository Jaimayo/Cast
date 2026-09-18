import { LOCK_SOUL_ID_FIRST } from "@/lib/soul";
import { Button } from "@/components/ui/button";

export function GenerateButton(props: {
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
  disabledReason?: string;
}) {
  return (
    <Button
      type="button"
      variant="metallic"
      size="xl"
      disabled={props.disabled || props.pending}
      title={props.disabled ? (props.disabledReason ?? LOCK_SOUL_ID_FIRST) : undefined}
      onClick={props.onClick}
      className="min-w-40"
    >
      {props.pending ? "Queueing…" : "Generate"}
    </Button>
  );
}
