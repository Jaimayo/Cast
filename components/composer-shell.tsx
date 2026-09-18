"use client";

import { useEffect, useMemo, useState } from "react";
import { ChipRail } from "@/components/chip-rail";
import { GenerateButton, TeaserAnimateLater } from "@/components/generate-button";
import { HeroCanvas } from "@/components/hero-canvas";
import { LockSoulIdFirstCta } from "@/components/lock-soul-id-first";
import { CreditsLater, PrivacyBadge } from "@/components/privacy-badge";
import { SoulBadge } from "@/components/soul-badge";
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
    return <p className="p-8 text-sm text-muted-foreground">Loading composer…</p>;
  }

  return (
    <div className="flex min-h-[calc(100svh-1px)] flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <a href="/app/characters" className="font-heading text-xl tracking-tight">
            Cast
          </a>
          <SoulBadge name={characterName} locked={locked} />
          {characterName ? <span className="truncate text-sm text-muted-foreground">{characterName}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <PrivacyBadge />
          <CreditsLater />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[16.5rem_minmax(0,1fr)_11rem]">
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

        <div className="flex flex-col items-center gap-5 px-4 py-6 lg:px-8">
          <HeroCanvas
            locked={locked}
            message={message}
            previewUrl={heroUrl}
            packId={focus?.id}
            training={training}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="sticky bottom-0 z-20 flex w-full max-w-[420px] flex-col items-center gap-3 bg-background/85 py-3 backdrop-blur-sm md:static md:bg-transparent md:py-0 md:backdrop-blur-none">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <GenerateButton
                disabled={!canGenerate}
                pending={pending}
                disabledReason={disabledReason}
                onClick={() => void generate()}
              />
              <TeaserAnimateLater />
            </div>
          </div>
          {!locked ? <LockSoulIdFirstCta packId={focus?.id} training={false} variant="link" /> : null}
          <p className="max-w-[46ch] text-center text-xs text-muted-foreground italic">
            Generate needs a Locked Soul ID and a Pose. No prompt textarea. No camera. No Advanced.
            Starters live in the Pack wizard only. Animate later is Phase 1.5.
          </p>
        </div>

        <aside className="border-t border-border p-4 text-sm text-muted-foreground lg:border-t-0 lg:border-l">
          <h4 className="mb-3 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            History
          </h4>
          {history.length === 0 ? <p>Session stills will land here.</p> : null}
          {history.map((job) => (
            <div key={job.id} className="mb-3">
              {job.previewUrl ? (
                <button
                  type="button"
                  className="block w-full overflow-hidden rounded-md ring-1 ring-border"
                  onClick={() => setHeroUrl(job.previewUrl ?? null)}
                >
                  <StillPreview src={job.previewUrl} alt="Still" className="aspect-[3/4] w-full object-cover" />
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
    </div>
  );
}
