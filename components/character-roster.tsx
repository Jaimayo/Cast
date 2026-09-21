import { DemoBadge } from "@/components/demo-pack-banner";
import { SoulBadge } from "@/components/soul-badge";
import { StillPreview } from "@/components/still-preview";
import { demoBadgeLabel, demoPackThumbAlt, type DemoPackState } from "@/lib/demo-pack";
import { isLockedSoul, soulStatusLabel } from "@/lib/soul";

type Pack = {
  id: string;
  name: string;
  status: string;
  refCount?: number;
  demo?: boolean;
  demoState?: DemoPackState;
  previewUrl?: string | null;
};

export function CharacterRoster(props: { packs: Pack[] }) {
  return (
    <div className="roster-grid">
      <a className="card roster-card" href="/app/characters/new">
        <div className="kicker">Empty</div>
        <h3>Create</h3>
        <p className="muted">New Character Pack</p>
      </a>
      {props.packs.map((pack) => {
        const locked = isLockedSoul(pack.status);
        const refs = pack.refCount ?? 0;
        const demoState: DemoPackState = pack.demoState ?? (locked ? "locked" : "draft");
        return (
          <div key={pack.id} className={pack.demo ? "card roster-card is-demo" : "card roster-card"}>
            <a href={`/app/characters/${pack.id}`}>
              {pack.previewUrl ? (
                <StillPreview
                  src={pack.previewUrl}
                  alt={pack.demo ? demoPackThumbAlt({ name: pack.name, demoState }) : pack.name}
                  className="roster-thumb"
                />
              ) : null}
              <h3>{pack.name}</h3>
              <p className="muted">
                {soulStatusLabel(pack.status)} · {refs} refs
              </p>
            </a>
            <div className="roster-badges">
              {pack.demo ? <DemoBadge label={demoBadgeLabel(demoState)} /> : null}
              {locked ? <SoulBadge name={pack.name} locked /> : pack.demo ? null : <span className="fictional-badge">Fictional only</span>}
            </div>
            {locked ? (
              <a className="btn secondary" href={`/app/create?pack=${pack.id}`}>
                Use in Create
              </a>
            ) : (
              <span className="muted">{pack.demo ? "Draft — lock before Create" : "Lock before Create"}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
