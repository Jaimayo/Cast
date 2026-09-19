import { CharacterRoster } from "@/components/character-roster";
import { DemoPackBanner } from "@/components/demo-pack-banner";
import { listPacks } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";
import { servingDemoPacks } from "@/server/demo-pack";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const user = await requireAttestedUser();
  const packs = await listPacks(user.id);
  const demo = servingDemoPacks() && packs.some((pack) => "demo" in pack && pack.demo);
  return (
    <section>
      <div className="row-between">
        <div>
          <div className="kicker">Characters</div>
          <h1>Character Packs</h1>
        </div>
        <a className="btn" href="/app/characters/new">
          + New
        </a>
      </div>
      <p className="muted">Lock a character before Create. Fictional adults only.</p>
      {demo ? <DemoPackBanner /> : null}
      <CharacterRoster packs={packs} />
    </section>
  );
}
