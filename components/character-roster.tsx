import { SoulBadge } from "@/components/soul-badge";
import { isLockedSoul } from "@/lib/soul";
import { packSwatch } from "@/lib/chip-visuals";
import { Button } from "@/components/ui/button";
import { RefCountMeter } from "@/components/ref-count-meter";
import { cn } from "@/lib/utils";

type Pack = { id: string; name: string; status: string; refCount?: number };

export function CharacterRoster(props: { packs: Pack[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <a
        href="/app/characters/new"
        className="cast-ease flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/30 p-6 text-center hover:border-primary/50 hover:bg-card/60"
      >
        <span className="text-[11px] tracking-[0.16em] text-primary uppercase">Empty</span>
        <h3 className="mt-2 font-heading text-2xl">Create</h3>
        <p className="mt-1 text-sm text-muted-foreground">New Character Pack</p>
      </a>
      {props.packs.map((pack) => {
        const locked = isLockedSoul(pack.status);
        const refs = pack.refCount ?? 0;
        const swatch = packSwatch(pack.id);
        return (
          <div key={pack.id} className="cast-surface flex flex-col gap-4 rounded-xl p-4">
            <a href={`/app/characters/${pack.id}`} className="block">
              <div
                className="mb-3 aspect-[4/3] rounded-lg ring-1 ring-border"
                style={{ background: `linear-gradient(152deg, ${swatch.from}, ${swatch.to})` }}
              />
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-heading text-xl">{pack.name}</h3>
                <SoulBadge name={pack.name} status={pack.status} locked={locked} />
              </div>
            </a>
            <RefCountMeter count={refs} />
            {locked ? (
              <Button asChild variant="outline" className="mt-auto rounded-full">
                <a href={`/app/create?pack=${pack.id}`}>Use in Create</a>
              </Button>
            ) : (
              <p className={cn("mt-auto text-sm text-muted-foreground")}>Lock before Create</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
