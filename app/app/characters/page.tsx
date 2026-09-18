import { CharacterRoster } from "@/components/cast/character-roster";
import { Button } from "@/components/ui/button";
import { listPacks } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const user = await requireAttestedUser();
  const packs = await listPacks(user.id);
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Characters</p>
          <h1 className="mt-1 font-heading text-4xl">Character Packs</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Lock a character before Create. Fictional only — no real-person upload.
          </p>
        </div>
        <Button asChild size="xl">
          <a href="/app/characters/new">+ New</a>
        </Button>
      </div>
      <CharacterRoster packs={packs} />
    </section>
  );
}
