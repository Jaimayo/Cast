import { CharacterRoster } from "@/components/character-roster";
import { listPacks } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";
import { Button } from "@/components/ui/button";

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
        <Button asChild className="rounded-full">
          <a href="/app/characters/new">+ New</a>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Lock a character before Create. Fictional only — no real-person upload.
      </p>
      <CharacterRoster packs={packs} />
    </section>
  );
}
