import { listPacks } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function StudioHomePage() {
  const user = await requireAttestedUser();
  const packs = await listPacks(user.id);
  const ready = packs.filter((pack) => pack.status === "ready" || pack.status === "locked");

  return (
    <section>
      <div className="kicker">Empty studio</div>
      <h1>Create a Character Pack to begin.</h1>
      <p className="lede">
        Stage 1 is a vertical slice: packs, generate-starters, composer chips, and queued stills.
        Video is an “Animate later” teaser only.
      </p>
      {packs.length === 0 ? (
        <div className="banner">No packs yet. Character is required before Composer will generate.</div>
      ) : (
        <p className="muted">
          {packs.length} pack{packs.length === 1 ? "" : "s"} · {ready.length} locked/ready
        </p>
      )}
      <div className="actions">
        <a className="btn" href="/studio/packs">
          Character Packs
        </a>
        <a className="btn secondary" href="/studio/composer">
          Open Composer
        </a>
      </div>
    </section>
  );
}
