import { FictionalBadge, SoulBadge } from "@/components/cast/soul-badge";
import { PlaceholderThumb } from "@/components/cast/placeholder-thumb";
import { RefCountMeter } from "@/components/cast/ref-count-meter";
import { Button } from "@/components/ui/button";
import { isLockedSoul } from "@/lib/soul";

type Pack = { id: string; name: string; status: string; refCount?: number };

export function CharacterRoster(props: { packs: Pack[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <a
        href="/app/characters/new"
        className="cast-surface group flex min-h-72 flex-col justify-between overflow-hidden rounded-xl border border-dashed border-border p-0 transition-colors duration-200 ease-out hover:border-primary/40"
      >
        <div className="flex aspect-[4/3] items-center justify-center bg-muted/40">
          <PlaceholderThumb id="create-pack" family="character" label="+" className="w-20 opacity-70" />
        </div>
        <div className="p-4">
          <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Empty</p>
          <h3 className="mt-1 font-heading text-2xl">Create</h3>
          <p className="mt-1 text-sm text-muted-foreground">New Character Pack</p>
        </div>
      </a>
      {props.packs.map((pack) => {
        const locked = isLockedSoul(pack.status);
        const refs = pack.refCount ?? 0;
        return (
          <div
            key={pack.id}
            className="cast-surface flex min-h-72 flex-col overflow-hidden rounded-xl border border-border bg-card"
          >
            <a href={`/app/characters/${pack.id}`} className="relative block">
              <PlaceholderThumb
                id={pack.id}
                family="character"
                label={pack.name}
                className="aspect-[4/3] rounded-none"
              />
              <span className="absolute top-3 left-3">
                <SoulBadge name={pack.name} status={pack.status} locked={locked} />
              </span>
            </a>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <a href={`/app/characters/${pack.id}`}>
                <h3 className="truncate font-heading text-xl">{pack.name}</h3>
              </a>
              <RefCountMeter count={refs} />
              {locked ? (
                <Button asChild variant="metallic" size="xl" className="mt-auto w-full">
                  <a href={`/app/create?pack=${pack.id}`}>Use in Create</a>
                </Button>
              ) : (
                <div className="mt-auto flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">Lock before Create</p>
                  <FictionalBadge />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
