import { SOUL_BADGE_LOCKED, SOUL_BADGE_UNLOCKED } from "@/lib/soul";

export function SoulBadge(props: { name?: string; locked?: boolean }) {
  if (!props.locked) {
    return <span className="muted">{SOUL_BADGE_UNLOCKED}</span>;
  }
  return (
    <span className="soul-badge" title={props.name ? `Soul ID · ${props.name}` : "Locked Character Pack"}>
      {SOUL_BADGE_LOCKED}
    </span>
  );
}
