import { generateButtonLabel, GENERATE_REASON_UNLOCKED } from "@/lib/generate-affordances";

export function GenerateButton(props: {
  disabled: boolean;
  pending: boolean;
  inProgress?: boolean;
  onClick: () => void;
  disabledReason?: string;
}) {
  const label = generateButtonLabel({ pending: props.pending, inProgress: Boolean(props.inProgress) });
  return (
    <button
      className="btn"
      type="button"
      disabled={props.disabled || props.pending}
      title={props.disabled ? (props.disabledReason ?? GENERATE_REASON_UNLOCKED) : undefined}
      onClick={props.onClick}
    >
      {label}
    </button>
  );
}

export function TeaserAnimateLater() {
  return (
    <button className="btn secondary" type="button" disabled title="Phase 1.5 — clips are not in Stage 1">
      Animate later
    </button>
  );
}
