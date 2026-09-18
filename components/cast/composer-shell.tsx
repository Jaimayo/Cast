"use client";

import { useEffect, useMemo, useState } from "react";
import { ChipRail } from "@/components/cast/chip-rail";
import { GenerateButton } from "@/components/cast/generate-button";
import { HeroCanvas } from "@/components/cast/hero-canvas";
import { LockSoulIdFirstCta } from "@/components/cast/lock-soul-id-first";
import { SoulBadge } from "@/components/cast/soul-badge";
import { TeaserAnimateLater } from "@/components/cast/teaser-animate-later";
import { StillPreview } from "@/components/still-preview";
import { api } from "@/lib/client";
import { isLockedSoul, LOCK_SOUL_ID_FIRST } from "@/lib/soul";

type Chip = { id: string; label: string };
type Pack = { id: string; name: string; status: string };
type Job = {
  id: string;
  kind: string;
  status: string;
  previewUrl?: string | null;
  lastError?: string | null;
  lastErrorCode?: string | null;
};

function spotlightPack(packs: Pack[], initialPackId?: string): Pack | undefined {
  const preferred = initialPackId ? packs.find((pack) => pack.id === initialPackId) : undefined;
  if (preferred && !isLockedSoul(preferred.status)) {
    return preferred;
  }
  return packs.find((pack) => pack.status === "training") ?? packs.find((pack) => !isLockedSoul(pack.status));
}

export function ComposerShell(props: { initialPackId?: string }) {
  const [chips, setChips] = useState<{
    pose: Chip[];
    outfit: Chip[];
    scene: Chip[];
    lighting: Chip[];
    body: Chip[];
  } | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [characterPackId, setCharacterPackId] = useState("");
  const [poseChipId, setPoseChipId] = useState("");
  const [outfitChipId, setOutfitChipId] = useState("");
  const [sceneChipId, setSceneChipId] = useState("");
  const [lightingChipId, setLightingChipId] = useState("");
  const [bodyChipId, setBodyChipId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      api<{ pose: Chip[]; outfit: Chip[]; scene: Chip[]; lighting: Chip[]; body: Chip[] }>("/api/chips"),
      api<{ packs: Pack[] }>("/api/packs"),
      api<{ jobs: Job[] }>("/api/jobs").catch(() => ({ jobs: [] })),
    ]).then(([chipData, packData, jobData]) => {
      setChips(chipData);
      setPacks(packData.packs);
      const stills = jobData.jobs.filter((job) => job.kind === "generate_still");
      setJobs(stills.slice(0, 8));
      const latestPreview = stills.find((job) => job.previewUrl)?.previewUrl ?? null;
      setHeroUrl(latestPreview);
      const preferred = props.initialPackId
        ? packData.packs.find((pack) => pack.id === props.initialPackId)
        : undefined;
      const locked =
        preferred && isLockedSoul(preferred.status)
          ? preferred
          : packData.packs.find((pack) => isLockedSoul(pack.status));
      setCharacterPackId(locked?.id ?? "");
      setPoseChipId(chipData.pose[0]?.id ?? "");
    });
  }, [props.initialPackId]);

  const trainingAny = packs.some((pack) => pack.status === "training");
  useEffect(() => {
    if (!trainingAny) return;
    const timer = window.setInterval(() => {
      void api<{ packs: Pack[] }>("/api/packs").then((data) => {
        setPacks(data.packs);
        const locked = data.packs.find((pack) => isLockedSoul(pack.status));
        setCharacterPackId((current) => {
          if (current && data.packs.some((pack) => pack.id === current && isLockedSoul(pack.status))) {
            return current;
          }
          return locked?.id ?? "";
        });
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [trainingAny]);

  const selected = packs.find((pack) => pack.id === characterPackId);
  const locked = Boolean(selected && isLockedSoul(selected.status));
  const focus = spotlightPack(packs, props.initialPackId);
  const training = focus?.status === "training" || selected?.status === "training";
  const canGenerate = locked && Boolean(poseChipId);
  const disabledReason = !locked ? LOCK_SOUL_ID_FIRST : !poseChipId ? "Pick a Pose" : undefined;

  const characterName = selected?.name;

  async function watchJob(jobId: string) {
    for (let i = 0; i < 40; i += 1) {
      const data = await api<{ job: Job }>(`/api/jobs/${jobId}`);
      setJobs((prev) => {
        const rest = prev.filter((job) => job.id !== jobId);
        return [data.job, ...rest].slice(0, 8);
      });
      if (data.job.previewUrl) {
        setHeroUrl(data.job.previewUrl);
      }
      if (data.job.status === "succeeded" || data.job.status === "failed") {
        if (data.job.status === "failed") {
          setError(data.job.lastError || "Generate failed. Try again.");
        }
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
    }
  }

  async function generate() {
    if (!canGenerate) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api<{ job: { id: string } }>("/api/composer/generate", {
        method: "POST",
        body: JSON.stringify({
          characterPackId,
          poseChipId,
          outfitChipId: outfitChipId || null,
          sceneChipId: sceneChipId || null,
          lightingChipId: lightingChipId || null,
          bodyChipId: bodyChipId || null,
        }),
      });
      setMessage(`Queued still ${result.job.id}. Prompt stays hidden.`);
      setJobs((prev) => [{ id: result.job.id, kind: "generate_still", status: "queued", previewUrl: null }, ...prev].slice(0, 8));
      void watchJob(result.job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setPending(false);
    }
  }

  const history = useMemo(
    () => jobs.filter((job) => job.kind === "generate_still"),
    [jobs],
  );

  if (!chips) {
    return <p className="px-6 py-10 text-sm text-muted-foreground">Loading composer…</p>;
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
        <SoulBadge name={characterName} locked={locked} status={selected?.status} />
      </div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_180px]">
        <ChipRail
          packs={packs}
          chips={chips}
          characterPackId={characterPackId}
          poseChipId={poseChipId}
          outfitChipId={outfitChipId}
          sceneChipId={sceneChipId}
          lightingChipId={lightingChipId}
          bodyChipId={bodyChipId}
          lockPackId={focus?.id}
          training={training}
          onCharacter={setCharacterPackId}
          onPose={setPoseChipId}
          onOutfit={setOutfitChipId}
          onScene={setSceneChipId}
          onLighting={setLightingChipId}
          onBody={setBodyChipId}
        />
        <div className="flex min-h-0 flex-col items-center overflow-y-auto px-4 py-6 md:px-8">
          <HeroCanvas
            locked={locked}
            message={message}
            previewUrl={heroUrl}
            packId={focus?.id}
            training={training}
          />
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          <div className="mt-5 hidden items-center justify-center gap-3 md:flex">
            <GenerateButton
              disabled={!canGenerate}
              pending={pending}
              disabledReason={disabledReason}
              onClick={() => void generate()}
            />
            <TeaserAnimateLater />
          </div>
          {!locked ? (
            <div className="mt-3">
              <LockSoulIdFirstCta packId={focus?.id} training={false} variant="link" />
            </div>
          ) : null}
          <p className="mt-4 max-w-md text-center text-xs text-muted-foreground italic">
            Generate needs a Locked Soul ID and a Pose. No prompt textarea. No camera. No Advanced.
            Starters live in the Pack wizard only. Animate later is Phase 1.5.
          </p>
        </div>
        <aside className="hidden overflow-y-auto border-l border-border p-4 text-sm text-muted-foreground lg:block">
          <h4 className="mb-3 text-[11px] tracking-[0.08em] text-muted-foreground uppercase">History</h4>
          {history.length === 0 ? <p>Session stills will land here.</p> : null}
          {history.map((job) => (
            <div key={job.id} className="mb-3">
              {job.previewUrl ? (
                <button
                  type="button"
                  className="block w-full overflow-hidden rounded-lg border border-border"
                  onClick={() => setHeroUrl(job.previewUrl ?? null)}
                >
                  <StillPreview src={job.previewUrl} alt="Still" className="still-thumb aspect-[3/4] w-full object-cover" />
                </button>
              ) : (
                <p>
                  {job.status} · {job.id.slice(0, 8)}
                  {job.status === "failed" && job.lastError ? (
                    <>
                      <br />
                      <span className="text-destructive">{job.lastError}</span>
                    </>
                  ) : null}
                </p>
              )}
            </div>
          ))}
        </aside>
      </div>
      <div className="sticky bottom-0 z-20 flex items-center justify-center gap-3 border-t border-border bg-background/90 px-3 py-3 backdrop-blur-md md:hidden">
        <GenerateButton
          disabled={!canGenerate}
          pending={pending}
          disabledReason={disabledReason}
          onClick={() => void generate()}
        />
        <TeaserAnimateLater />
      </div>
    </div>
  );
}
