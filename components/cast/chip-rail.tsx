"use client";

import { ChipSelect } from "@/components/cast/chip-select";
import { LockSoulIdFirstCta } from "@/components/cast/lock-soul-id-first";
import { PlaceholderThumb } from "@/components/cast/placeholder-thumb";
import { SoulBadge } from "@/components/cast/soul-badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-media-query";
import { isLockedSoul } from "@/lib/soul";
import { cn } from "@/lib/utils";
import { Aperture, Lamp, PersonStanding, Shirt, SunMedium, UserRound } from "lucide-react";

type Chip = { id: string; label: string };
type Pack = { id: string; name: string; status: string };

function CharacterPicker(props: {
  packs: Pack[];
  value: string;
  onChange: (id: string) => void;
  lockPackId?: string | null;
  training?: boolean;
}) {
  const mobile = useIsMobile();
  const lockedPacks = props.packs.filter((pack) => isLockedSoul(pack.status));
  const selected = lockedPacks.find((pack) => pack.id === props.value);

  if (lockedPacks.length === 0) {
    return (
      <div className="px-2 py-2">
        <h4 className="mb-2 text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Character *</h4>
        <LockSoulIdFirstCta packId={props.lockPackId} training={props.training} variant="link" />
      </div>
    );
  }

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-auto w-full justify-start gap-3 rounded-xl border border-transparent px-2 py-2 text-left hover:bg-muted",
        selected && "border-primary/40 ring-1 ring-primary/70",
      )}
    >
      <div className="size-11 shrink-0 overflow-hidden rounded-[var(--radius-chip)]">
        {selected ? (
          <PlaceholderThumb id={selected.id} family="character" label={selected.name} />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
            <UserRound className="size-4" />
          </div>
        )}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Character *</span>
        <span className="block truncate text-sm">{selected?.name ?? "Select a Locked pack…"}</span>
      </span>
    </Button>
  );

  const grid = (
    <div className="grid grid-cols-2 gap-2">
      {lockedPacks.map((pack) => {
        const active = pack.id === props.value;
        return (
          <button
            key={pack.id}
            type="button"
            className={cn(
              "overflow-hidden rounded-[var(--radius-chip)] border border-border text-left transition-colors duration-200 ease-out",
              active && "border-primary ring-2 ring-primary",
            )}
            onClick={() => props.onChange(pack.id)}
          >
            <PlaceholderThumb id={pack.id} family="character" label={pack.name} />
            <div className="flex items-center justify-between gap-1 px-2 py-1.5">
              <span className="truncate text-xs">{pack.name}</span>
              <SoulBadge name={pack.name} status={pack.status} locked />
            </div>
          </button>
        );
      })}
    </div>
  );

  if (mobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto bg-card">
          <SheetHeader>
            <SheetTitle>Character</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">{grid}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" side="right" className="w-[min(22rem,calc(100vw-2rem))] p-3">
        {grid}
      </PopoverContent>
    </Popover>
  );
}

export function ChipRail(props: {
  packs: Pack[];
  chips: { pose: Chip[]; outfit: Chip[]; scene: Chip[]; lighting: Chip[]; body: Chip[] };
  characterPackId: string;
  poseChipId: string;
  outfitChipId: string;
  sceneChipId: string;
  lightingChipId: string;
  bodyChipId: string;
  onCharacter: (id: string) => void;
  onPose: (id: string) => void;
  onOutfit: (id: string) => void;
  onScene: (id: string) => void;
  onLighting: (id: string) => void;
  onBody: (id: string) => void;
  lockPackId?: string | null;
  training?: boolean;
}) {
  return (
    <aside className="chip-rail flex flex-col gap-1 bg-muted/40 p-3">
      <CharacterPicker
        packs={props.packs}
        value={props.characterPackId}
        onChange={props.onCharacter}
        lockPackId={props.lockPackId}
        training={props.training}
      />
      <ChipSelect
        title="Pose"
        required
        family="pose"
        chips={props.chips.pose}
        value={props.poseChipId}
        onChange={props.onPose}
        icon={<PersonStanding className="size-4" />}
      />
      <ChipSelect
        title="Outfit"
        optional
        family="outfit"
        chips={props.chips.outfit}
        value={props.outfitChipId}
        onChange={props.onOutfit}
        icon={<Shirt className="size-4" />}
      />
      <ChipSelect
        title="Scene"
        optional
        family="scene"
        chips={props.chips.scene}
        value={props.sceneChipId}
        onChange={props.onScene}
        icon={<Aperture className="size-4" />}
      />
      <ChipSelect
        title="Lighting"
        optional
        family="lighting"
        chips={props.chips.lighting}
        value={props.lightingChipId}
        onChange={props.onLighting}
        icon={<Lamp className="size-4" />}
      />
      <ChipSelect
        title="Body"
        optional
        family="body"
        chips={props.chips.body}
        value={props.bodyChipId}
        onChange={props.onBody}
        icon={<SunMedium className="size-4" />}
      />
    </aside>
  );
}
