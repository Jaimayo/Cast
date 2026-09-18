"use client";

import { ChipSelect } from "@/components/chip-select";

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
}) {
  return (
    <aside className="chip-rail">
      <div className="chip-family">
        <h4>Character *</h4>
        <select value={props.characterPackId} onChange={(event) => props.onCharacter(event.target.value)}>
          <option value="">Select a Locked pack…</option>
          {props.packs.map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.name} · {pack.status}
            </option>
          ))}
        </select>
      </div>
      <ChipSelect title="Pose" required chips={props.chips.pose} value={props.poseChipId} onChange={props.onPose} />
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
