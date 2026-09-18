import { CharacterRoster } from "@/components/character-roster";
import { listPacks } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";
import { getEnv } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const user = await requireAttestedUser();
  const packs = await listPacks(user.id);
  const stubMode = getEnv().providerMode === "stub";
  return (
    <section className="page-section">
      <div className="row-between">
        <div>
          <div className="kicker">Characters</div>
          <h1>Character Packs</h1>
        </div>
        <a className="btn" href="/app/characters/new">
          + New
        </a>
      </div>
      <p className="lede-sm">
        Lock a fictional character before Create. Generate-then-lock or library-train from in-app stills
        only — no real-person upload.
      </p>
      <CharacterRoster packs={packs} stubMode={stubMode} />
    </section>
  );
}
