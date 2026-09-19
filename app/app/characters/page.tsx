import { CharacterRoster } from "@/components/character-roster";
import { listPacks } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const user = await requireAttestedUser();
  const packs = await listPacks(user.id);
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
      <CharacterRoster packs={packs} />
    </section>
  );
}
