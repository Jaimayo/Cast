"use client";

import { ChipPicker } from "@/components/chip-picker";
import { LockSoulIdFirstCta } from "@/components/lock-soul-id-first";
import { isLockedSoul } from "@/lib/soul";
import { packSwatch } from "@/lib/chip-visuals";
import { cn } from "@/lib/utils";

type Chip = { id: string; label: string };
type Pack = { id: string; name: string; status: string };

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
  const lockedPacks = props.packs.filter((pack) => isLockedSoul(pack.status));

  return (
    <aside className="flex flex-col gap-6 bg-muted/40 p-4 md:min-h-full md:border-r md:border-border">
      <div>
        <h4 className="mb-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Character <span className="text-primary">*</span>
        </h4>
        {lockedPacks.length === 0 ? (
          <LockSoulIdFirstCta packId={props.lockPackId} training={props.training} variant="link" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {lockedPacks.map((pack) => {
              const selected = props.characterPackId === pack.id;
              const swatch = packSwatch(pack.id);
              return (
                <button
                  key={pack.id}
                  type="button"
                  className="flex flex-col gap-1.5 text-left"
                  onClick={() => props.onCharacter(pack.id)}
                >
                  <span
                    className={cn(
                      "aspect-square rounded-md ring-1 ring-border",
                      selected && "ring-2 ring-primary",
                    )}
                    style={{ background: `linear-gradient(152deg, ${swatch.from}, ${swatch.to})` }}
                  />
                  <span className="truncate text-[11px] text-muted-foreground">{pack.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <ChipPicker
        family="pose"
        title="Pose"
        required
        chips={props.chips.pose}
        value={props.poseChipId}
        onChange={props.onPose}
      />
      <ChipPicker
        family="outfit"
        title="Outfit"
        optional
        chips={props.chips.outfit}
        value={props.outfitChipId}
        onChange={props.onOutfit}
      />
      <ChipPicker
        family="scene"
        title="Scene"
        optional
        chips={props.chips.scene}
        value={props.sceneChipId}
        onChange={props.onScene}
      />
      <ChipPicker
        family="lighting"
        title="Lighting"
        optional
        chips={props.chips.lighting}
        value={props.lightingChipId}
        onChange={props.onLighting}
      />
      <ChipPicker
        family="body"
        title="Body"
        optional
        chips={props.chips.body}
        value={props.bodyChipId}
        onChange={props.onBody}
      />
    </aside>
  );
}
