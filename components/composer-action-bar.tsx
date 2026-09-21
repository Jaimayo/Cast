import { GenerateButton, TeaserAnimateLater } from "@/components/generate-button";

export function ComposerActionBar(props: {
  disabled: boolean;
  pending: boolean;
  inProgress?: boolean;
  disabledReason?: string;
  onGenerate: () => void;
  cancel?: { busy: boolean; onCancel: () => void } | null;
}) {
  return (
    <div className="composer-action-bar">
      <div className="composer-action-row">
        <GenerateButton
          disabled={props.disabled}
          pending={props.pending}
          inProgress={props.inProgress}
          disabledReason={props.disabledReason}
          onClick={props.onGenerate}
        />
        {props.cancel ? (
          <button
            className="btn secondary"
            type="button"
            disabled={props.cancel.busy}
            onClick={props.cancel.onCancel}
          >
            {props.cancel.busy ? "Canceling…" : "Cancel"}
          </button>
        ) : null}
        <TeaserAnimateLater />
      </div>
      {props.disabledReason ? <p className="generate-reason">{props.disabledReason}</p> : null}
    </div>
  );
}
