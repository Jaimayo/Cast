"use client";

import { ChipSelect } from "@/components/chip-select";

type Chip = { id: string; label: string };

export function ChipRail(props: {
  chips: { pose: Chip[]; outfit: Chip[]; scene: Chip[]; lighting: Chip[]; body: Chip[] };
  poseChipId: string;
  outfitChipId: string;
  sceneChipId: string;
  lightingChipId: string;
  bodyChipId: string;
  onPose: (id: string) => void;
  onOutfit: (id: string) => void;
  onScene: (id: string) => void;
  onLighting: (id: string) => void;
  onBody: (id: string) => void;
}) {
  return (
    <section className="chip-workbench" aria-label="Composer chips">
      <ChipSelect
        family="pose"
        title="Pose"
        required
        chips={props.chips.pose}
        value={props.poseChipId}
        onChange={props.onPose}
      />
      <ChipSelect
        family="outfit"
        title="Outfit"
        optional
        chips={props.chips.outfit}
        value={props.outfitChipId}
        onChange={props.onOutfit}
      />
      <ChipSelect
        family="scene"
        title="Scene"
        optional
        chips={props.chips.scene}
        value={props.sceneChipId}
        onChange={props.onScene}
      />
      <ChipSelect
        family="lighting"
        title="Lighting"
        optional
        chips={props.chips.lighting}
        value={props.lightingChipId}
        onChange={props.onLighting}
      />
      <ChipSelect
        family="body"
        title="Body"
        optional
        chips={props.chips.body}
        value={props.bodyChipId}
        onChange={props.onBody}
      />
    </section>
  );
}
