import { PackWizard } from "@/components/pack-wizard";
import { SoulBadge } from "@/components/soul-badge";
import { isLockedSoul, soulStatusLabel } from "@/lib/soul";
import { countRefs, getPack } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAttestedUser();
  const { id } = await params;
  const pack = await getPack(user.id, id);
  if (!pack) notFound();
  const refCount = await countRefs(pack.id);
  const locked = isLockedSoul(pack.status);

  if (pack.status === "draft" || pack.status === "failed") {
    return <PackWizard initialPackId={pack.id} />;
  }

  return (
    <section>
      <div className="kicker">Character Pack</div>
      <div className="row-between">
        <h1>{pack.name}</h1>
        <SoulBadge name={pack.name} locked={locked} />
      </div>
      <p className="muted">
        {soulStatusLabel(pack.status)} · refs {refCount}/20
      </p>
      <div className="banner">Face upload from a real person is intentionally omitted.</div>
      <div className="actions">
        {locked ? (
          <a className="btn" href={`/app/create?pack=${pack.id}`}>
            Use in Create
          </a>
        ) : (
          <span className="muted">Generate unlocks when this pack is Locked.</span>
        )}
        <button className="btn secondary" type="button" disabled title="Later">
          Test grid
        </button>
        <button className="btn secondary" type="button" disabled title="Later">
          Retrain
        </button>
      </div>
    </section>
  );
}
