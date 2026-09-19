"use client";

import { AspectChipSelect } from "@/components/aspect-chip-select";
import { ChipSelect } from "@/components/chip-select";
import { LockSoulIdFirstCta } from "@/components/lock-soul-id-first";
import { isLockedSoul } from "@/lib/soul";
import type { StillAspectId } from "@/lib/still-aspect";

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
  aspectRatio: StillAspectId;
  onCharacter: (id: string) => void;
  onPose: (id: string) => void;
  onOutfit: (id: string) => void;
  onScene: (id: string) => void;
  onLighting: (id: string) => void;
  onBody: (id: string) => void;
  onAspect: (id: StillAspectId) => void;
  lockPackId?: string | null;
  training?: boolean;
}) {
  const lockedPacks = props.packs.filter((pack) => isLockedSoul(pack.status));

  return (
    <aside className="chip-rail">
      <div className="chip-family">
        <h4>Character *</h4>
        {lockedPacks.length === 0 ? (
          <LockSoulIdFirstCta packId={props.lockPackId} training={props.training} variant="link" />
        ) : (
          <select value={props.characterPackId} onChange={(event) => props.onCharacter(event.target.value)}>
            <option value="">Select a Locked pack…</option>
            {lockedPacks.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <ChipSelect title="Pose" required chips={props.chips.pose} value={props.poseChipId} onChange={props.onPose} />
      <AspectChipSelect value={props.aspectRatio} onChange={props.onAspect} />
      <ChipSelect title="Outfit" optional chips={props.chips.outfit} value={props.outfitChipId} onChange={props.onOutfit} />
      <ChipSelect title="Scene" optional chips={props.chips.scene} value={props.sceneChipId} onChange={props.onScene} />
      <ChipSelect
        title="Lighting"
        optional
        chips={props.chips.lighting}
        value={props.lightingChipId}
        onChange={props.onLighting}
      />
      <ChipSelect title="Body" optional chips={props.chips.body} value={props.bodyChipId} onChange={props.onBody} />
    </aside>
  );
}
