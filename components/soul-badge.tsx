export function SoulBadge(props: { name?: string; locked?: boolean }) {
  if (!props.locked) {
    return <span className="muted">No Soul ID</span>;
  }
  return (
    <span className="soul-badge" title="Locked Character Pack">
      Soul: {props.name ?? "Locked"} ✓
    </span>
  );
}
