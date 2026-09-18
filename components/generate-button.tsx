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
    <div className="teaser-animate">
      <div className="teaser-row">
        <button
          className="btn secondary teaser-btn"
          type="button"
          disabled
          title="Short clips come in Phase 1.5 — stills first."
        >
          Animate later
        </button>
        <span className="phase-badge" title="Not available in Stage 1">
          Phase 1.5
        </span>
      </div>
      <p className="teaser-help">Short clips come in Phase 1.5 — stills first.</p>
    </div>
  );
}
