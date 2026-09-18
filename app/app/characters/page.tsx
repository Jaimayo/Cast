import { CharacterRoster } from "@/components/character-roster";
import { MetallicButton } from "@/components/metallic-button";
import { listPacks } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const user = await requireAttestedUser();
  const packs = await listPacks(user.id);
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-primary uppercase">Characters</p>
          <h1 className="font-heading text-3xl">Character Packs</h1>
        </div>
        <MetallicButton asChild>
          <a href="/app/characters/new">+ New</a>
        </MetallicButton>
      </div>
      <p className="text-sm text-muted-foreground">
        Lock a character before Create. Fictional only — no real-person upload.
      </p>
      <CharacterRoster packs={packs} />
    </section>
  );
}
