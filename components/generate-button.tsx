import { generateButtonLabel, GENERATE_REASON_UNLOCKED } from "@/lib/generate-affordances";
import { ANIMATE_LATER_BADGE, ANIMATE_LATER_HELPER, ANIMATE_LATER_LABEL } from "@/lib/studio-copy";

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
      className="btn generate-btn"
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
    <button className="btn secondary animate-later" type="button" disabled title={ANIMATE_LATER_HELPER}>
      <span>{ANIMATE_LATER_LABEL}</span>
      <span className="phase-badge">{ANIMATE_LATER_BADGE}</span>
    </button>
  );
}
