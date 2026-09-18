export function GenerateButton(props: {
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button className="btn" type="button" disabled={props.disabled || props.pending} onClick={props.onClick}>
      {props.pending ? "Queueing…" : "Generate"}
    </button>
  );
}

export function TeaserAnimateLater() {
  return (
    <button className="btn secondary" type="button" disabled title="Phase 1.5">
      Animate later
    </button>
  );
}
