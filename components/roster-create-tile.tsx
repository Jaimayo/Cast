import {
  ROSTER_CREATE_ARIA,
  ROSTER_CREATE_CTA,
  ROSTER_CREATE_HELPER,
  ROSTER_CREATE_HREF,
} from "@/lib/studio-copy";

export function RosterCreateTile() {
  return (
    <a className="roster-create-tile" href={ROSTER_CREATE_HREF} aria-label={ROSTER_CREATE_ARIA}>
      <span className="roster-create-plus" aria-hidden>
        +
      </span>
      <span className="roster-create-cta">{ROSTER_CREATE_CTA}</span>
      <span className="roster-create-helper">{ROSTER_CREATE_HELPER}</span>
    </a>
  );
}
