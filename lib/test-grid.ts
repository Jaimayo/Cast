import { getChip } from "@/lib/chips";
import { isLockedSoul } from "@/lib/soul";
import { DEFAULT_STILL_ASPECT_ID, getStillAspect, type StillAspectId } from "@/lib/still-aspect";

/**
 * Stage 1 Test grid: a small identity check for a Locked pack.
 * Same Composer chips as Create → Generate. Wardrobe/scene/lighting stay
 * put so pose is the variable. Frame is always 3:4 portrait.
 */
export type TestGridSelection = {
  poseChipId: string;
  outfitChipId: string;
  sceneChipId: string;
  lightingChipId: string;
};

export const TEST_GRID_ASPECT_ID: StillAspectId = DEFAULT_STILL_ASPECT_ID;

export const TEST_GRID_FICTIONAL_COPY =
  "Fictional identity check only. Four Composer stills at 3:4 portrait — pose varies, wardrobe stays put. Not a camera roll.";

export const TEST_GRID_EMPTY_COPY = "Queue Test grid to fill this 3:4 cell.";

export const STILL_SOURCES = ["composer", "test_grid", "demo"] as const;
export type StillSource = (typeof STILL_SOURCES)[number];

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

export function isStillSource(value: unknown): value is StillSource {
  return typeof value === "string" && (STILL_SOURCES as readonly string[]).includes(value);
}

/** Whitelist only. Never returns compiled prompts, adapter keys, or unknown source strings. */
export function stillSourceFromInput(inputJson: unknown): StillSource | null {
  if (!inputJson || typeof inputJson !== "object" || Array.isArray(inputJson)) {
    return null;
  }
  return isStillSource((inputJson as Record<string, unknown>).source)
    ? ((inputJson as Record<string, unknown>).source as StillSource)
    : null;
}

/** Known pose chip only — unknown strings stay off the public job. */
export function poseChipIdFromInput(inputJson: unknown): string | null {
  if (!inputJson || typeof inputJson !== "object" || Array.isArray(inputJson)) {
    return null;
  }
  const pose = (inputJson as Record<string, unknown>).poseChipId;
  if (typeof pose !== "string") {
    return null;
  }
  return getChip(pose)?.family === "pose" ? pose : null;
}

export function testGridPoseLabel(poseChipId: string): string {
  return getChip(poseChipId)?.label ?? poseChipId;
}

export type TestGridJob = {
  id: string;
  kind: string;
  status: string;
  characterPackId?: string | null;
  stillSource?: string | null;
  poseChipId?: string | null;
  previewUrl?: string | null;
  createdAt?: Date | string | null;
};

export type TestGridCellState = "empty" | "queued" | "running" | "succeeded" | "failed" | "canceled";

export type TestGridCell = {
  poseChipId: string;
  poseLabel: string;
  aspectId: StillAspectId;
  aspectLabel: string;
  state: TestGridCellState;
  job: TestGridJob | null;
  previewUrl: string | null;
};

export function isTestGridJob(job: { kind?: string; stillSource?: string | null }): boolean {
  return job.kind === "generate_still" && job.stillSource === "test_grid";
}

function jobTimeMs(job: TestGridJob): number {
  if (!job.createdAt) return 0;
  const ms = new Date(job.createdAt).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function cellState(job: TestGridJob | null): TestGridCellState {
  if (!job) return "empty";
  if (job.status === "queued") return "queued";
  if (job.status === "running") return "running";
  if (job.status === "succeeded") return "succeeded";
  if (job.status === "failed") return "failed";
  if (job.status === "canceled") return "canceled";
  return "empty";
}

/**
 * Keep the latest job per Test grid pose. Incoming rows merge onto current so a
 * poll that omits stub-only jobs does not wipe cells the POST already filled.
 */
export function mergeTestGridJobs(current: TestGridJob[], incoming: TestGridJob[], packId: string): TestGridJob[] {
  const byPose = new Map<string, TestGridJob>();

  function consider(job: TestGridJob) {
    if (!isTestGridJob(job)) return;
    if (job.characterPackId && job.characterPackId !== packId) return;
    const pose = job.poseChipId && TEST_GRID_SELECTIONS.some((row) => row.poseChipId === job.poseChipId)
      ? job.poseChipId
      : null;
    if (!pose) return;
    const existing = byPose.get(pose);
    if (!existing || jobTimeMs(job) >= jobTimeMs(existing)) {
      byPose.set(pose, job);
    }
  }

  for (const job of current) consider(job);
  for (const job of incoming) consider(job);
  return TEST_GRID_SELECTIONS.map((row) => byPose.get(row.poseChipId)).filter((job): job is TestGridJob => Boolean(job));
}

export function emptyTestGridCells(): TestGridCell[] {
  return testGridCellsFromJobs([], "");
}

export function testGridCellsFromJobs(jobs: TestGridJob[], packId: string): TestGridCell[] {
  const byPose = new Map(mergeTestGridJobs([], jobs, packId).map((job) => [job.poseChipId, job]));
  const aspect = getStillAspect(TEST_GRID_ASPECT_ID);
  return TEST_GRID_SELECTIONS.map((selection) => {
    const job = byPose.get(selection.poseChipId) ?? null;
    return {
      poseChipId: selection.poseChipId,
      poseLabel: testGridPoseLabel(selection.poseChipId),
      aspectId: aspect.id,
      aspectLabel: aspect.label,
      state: cellState(job),
      job,
      previewUrl: job?.previewUrl ?? null,
    };
  });
}
