import { isLockedSoul } from "@/lib/soul";

/**
 * Stage 1 Test grid: a small identity check for a Locked pack.
 * Same Composer chips as Create → Generate. Wardrobe/scene/lighting stay
 * put so pose is the variable.
 */
export type TestGridSelection = {
  poseChipId: string;
  outfitChipId: string;
  sceneChipId: string;
  lightingChipId: string;
};

export const TEST_GRID_SELECTIONS: TestGridSelection[] = [
  {
    poseChipId: "standing-neutral",
    outfitChipId: "tailored-black",
    sceneChipId: "cyc-studio",
    lightingChipId: "softbox",
  },
  {
    poseChipId: "seated",
    outfitChipId: "tailored-black",
    sceneChipId: "cyc-studio",
    lightingChipId: "softbox",
  },
  {
    poseChipId: "three-quarter",
    outfitChipId: "tailored-black",
    sceneChipId: "cyc-studio",
    lightingChipId: "softbox",
  },
  {
    poseChipId: "over-shoulder",
    outfitChipId: "tailored-black",
    sceneChipId: "cyc-studio",
    lightingChipId: "softbox",
  },
];

export const TEST_GRID_SIZE = TEST_GRID_SELECTIONS.length;

export function canQueueTestGrid(status: string): boolean {
  return isLockedSoul(status);
}

export function canRetrainPack(status: string): boolean {
  return isLockedSoul(status);
}
