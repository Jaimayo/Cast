import { SoulBadge } from "@/components/soul-badge";
import { isLockedSoul } from "@/lib/soul";
import { packSwatch } from "@/lib/chip-visuals";
import { MetallicButton } from "@/components/metallic-button";
import { RefCountMeter } from "@/components/ref-count-meter";
import { cn } from "@/lib/utils";

type Pack = { id: string; name: string; status: string; refCount?: number };

export function CharacterRoster(props: { packs: Pack[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <a
        href="/app/characters/new"
        className="cast-ease flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/30 p-6 text-center hover:border-primary/50 hover:bg-card/60"
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
          <article
            key={pack.id}
            className="cast-surface cast-ease group flex flex-col overflow-hidden rounded-xl hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/35"
          >
            <a href={`/app/characters/${pack.id}`} className="block">
              <div className="relative aspect-[16/10] overflow-hidden">
                <div
                  className="size-full"
                  style={{ background: `linear-gradient(152deg, ${swatch.from}, ${swatch.to})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                <div className="absolute top-3 left-3">
                  <SoulBadge name={pack.name} status={pack.status} locked={locked} />
                </div>
              </div>
              <div className="space-y-3 px-4 pt-4">
                <h3 className="font-heading text-xl leading-tight">{pack.name}</h3>
                <RefCountMeter count={refs} />
              </div>
            </a>
            <div className="mt-auto px-4 pt-3 pb-4">
              {locked ? (
                <MetallicButton asChild className="w-full">
                  <a href={`/app/create?pack=${pack.id}`}>Use in Create</a>
                </MetallicButton>
              ) : (
                <p className={cn("text-sm text-muted-foreground")}>Lock before Create</p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
