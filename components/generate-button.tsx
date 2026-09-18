export function GenerateButton(props: {
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
  disabledReason?: string;
}) {
  return (
    <button
      className="btn"
      type="button"
      disabled={props.disabled || props.pending}
      title={props.disabled ? (props.disabledReason ?? "Select a Locked character and a Pose") : undefined}
      onClick={props.onClick}
    >
      {props.pending ? "Queueing…" : "Generate"}
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
