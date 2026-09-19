export function LoadingState(props: { label: string; compact?: boolean }) {
  return (
    <div className={props.compact ? "loading-state is-compact" : "loading-state"} role="status" aria-live="polite">
      <div className="loading-shimmer" aria-hidden="true" />
      <p className="muted">{props.label}</p>
    </div>
  );
}
