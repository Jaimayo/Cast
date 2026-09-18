import { FictionalBadge, SoulBadge } from "@/components/cast/soul-badge";
import { PlaceholderThumb } from "@/components/cast/placeholder-thumb";
import { RefCountMeter } from "@/components/cast/ref-count-meter";
import { Button } from "@/components/ui/button";
import { isLockedSoul } from "@/lib/soul";

type Pack = { id: string; name: string; status: string; refCount?: number };

export function CharacterRoster(props: { packs: Pack[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <a
        href="/app/characters/new"
        className="cast-surface group flex min-h-64 flex-col justify-between rounded-xl border border-dashed border-border p-5 transition-colors duration-200 ease-out hover:border-primary/40"
      >
        <PlaceholderThumb id="create-pack" family="character" label="+" className="w-16 opacity-70" />
        <div>
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
            className="cast-surface flex min-h-64 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-4"
          >
            <a href={`/app/characters/${pack.id}`} className="block">
              <PlaceholderThumb id={pack.id} family="character" label={pack.name} />
            </a>
            <div className="flex items-start justify-between gap-2">
              <a href={`/app/characters/${pack.id}`} className="min-w-0">
                <h3 className="truncate font-heading text-xl">{pack.name}</h3>
              </a>
              <SoulBadge name={pack.name} status={pack.status} locked={locked} />
            </div>
            <RefCountMeter count={refs} />
            {locked ? (
              <Button asChild variant="outline" className="mt-auto w-full rounded-full">
                <a href={`/app/create?pack=${pack.id}`}>Use in Create</a>
              </Button>
            ) : (
              <p className="mt-auto text-sm text-muted-foreground">Lock before Create</p>
            )}
            {!locked ? <FictionalBadge /> : null}
          </div>
        );
      })}
    </div>
  );
}
