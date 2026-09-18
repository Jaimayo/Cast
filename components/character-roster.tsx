import { SoulBadge } from "@/components/soul-badge";
import { isLockedSoul, soulStatusLabel } from "@/lib/soul";

type Pack = { id: string; name: string; status: string; refCount?: number };

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
        return (
          <div key={pack.id} className="card roster-card">
            <a href={`/app/characters/${pack.id}`}>
              <h3>{pack.name}</h3>
              <p className="muted">
                {soulStatusLabel(pack.status)} · {refs} refs
              </p>
            </a>
            {locked ? <SoulBadge name={pack.name} locked /> : <span className="fictional-badge">Fictional only</span>}
            {locked ? (
              <a className="btn secondary" href={`/app/create?pack=${pack.id}`}>
                Use in Create
              </a>
            ) : (
              <span className="muted">Lock before Create</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
