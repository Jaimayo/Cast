"use client";

import { useEffect, useMemo, useState } from "react";
import { ChipRail } from "@/components/chip-rail";
import { EmptyState } from "@/components/empty-state";
import { GenerateButton, TeaserAnimateLater } from "@/components/generate-button";
import { HeroCanvas } from "@/components/hero-canvas";
import { LoadingState } from "@/components/loading-state";
import { SoulBadge } from "@/components/soul-badge";
import { StillPreview } from "@/components/still-preview";
import { api } from "@/lib/client";
import {
  pickKnownChipId,
  readComposerDraft,
  writeComposerDraft,
} from "@/lib/composer-draft";
import { canGenerateStill, generateDisabledReason } from "@/lib/generate-affordances";
import { jobCanceledMessage } from "@/lib/job-cancel";
import { isInProgressJob, jobQueuePresentation, type JobDisplayInput } from "@/lib/job-display";
import { isLockedSoul } from "@/lib/soul";
import {
  DEFAULT_STILL_ASPECT_ID,
  stillAspectFromUnknown,
  type StillAspectId,
} from "@/lib/still-aspect";

type Chip = { id: string; label: string };
type Pack = { id: string; name: string; status: string };
type Job = JobDisplayInput & {
  id: string;
  previewUrl?: string | null;
  cancelSupported?: boolean;
  cancelDisabledReason?: string | null;
};

function stillJobs(jobs: Job[]): Job[] {
  return jobs.filter((job) => job.kind === "generate_still").slice(0, 8);
}

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
  const [aspectRatio, setAspectRatio] = useState<StillAspectId>(DEFAULT_STILL_ASPECT_ID);
  const [draftReady, setDraftReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [watchingId, setWatchingId] = useState<string | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [attested, setAttested] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    void api<{ user: { ageAttestedAt: string | null } | null }>("/api/auth/session")
      .then((data) => setAttested(Boolean(data.user?.ageAttestedAt)))
      .catch(() => {
        /* Layout already gated; keep Generate available if session read fails. */
      });
    void Promise.all([
      api<{ pose: Chip[]; outfit: Chip[]; scene: Chip[]; lighting: Chip[]; body: Chip[] }>("/api/chips"),
      api<{ packs: Pack[] }>("/api/packs"),
      api<{ jobs: Job[] }>("/api/jobs").catch(() => ({ jobs: [] })),
    ]).then(([chipData, packData, jobData]) => {
      setChips(chipData);
      setPacks(packData.packs);
      const stills = stillJobs(jobData.jobs);
      setJobs(stills);
      const latestPreview = stills.find((job) => job.previewUrl)?.previewUrl ?? null;
      setHeroUrl(latestPreview);
      const preferred = props.initialPackId
        ? packData.packs.find((pack) => pack.id === props.initialPackId)
        : undefined;
      const locked =
        preferred && isLockedSoul(preferred.status)
          ? preferred
          : packData.packs.find((pack) => isLockedSoul(pack.status));
      const draft = readComposerDraft(window.sessionStorage);
      const lockedFromDraft =
        draft?.characterPackId &&
        packData.packs.some((pack) => pack.id === draft.characterPackId && isLockedSoul(pack.status))
          ? packData.packs.find((pack) => pack.id === draft.characterPackId)
          : undefined;
      setCharacterPackId(locked?.id ?? lockedFromDraft?.id ?? "");
      setPoseChipId(pickKnownChipId(draft?.poseChipId, chipData.pose, chipData.pose[0]?.id ?? ""));
      setOutfitChipId(pickKnownChipId(draft?.outfitChipId, chipData.outfit));
      setSceneChipId(pickKnownChipId(draft?.sceneChipId, chipData.scene));
      setLightingChipId(pickKnownChipId(draft?.lightingChipId, chipData.lighting));
      setBodyChipId(pickKnownChipId(draft?.bodyChipId, chipData.body));
      setAspectRatio(stillAspectFromUnknown(draft?.aspectRatio));
      setDraftReady(true);
    });
  }, [props.initialPackId]);

  useEffect(() => {
    if (!draftReady) return;
    writeComposerDraft(window.sessionStorage, {
      characterPackId: characterPackId || undefined,
      poseChipId: poseChipId || undefined,
      outfitChipId: outfitChipId || undefined,
      sceneChipId: sceneChipId || undefined,
      lightingChipId: lightingChipId || undefined,
      bodyChipId: bodyChipId || undefined,
      aspectRatio,
    });
  }, [
    draftReady,
    characterPackId,
    poseChipId,
    outfitChipId,
    sceneChipId,
    lightingChipId,
    bodyChipId,
    aspectRatio,
  ]);

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

  const inProgress = jobs.some((job) => isInProgressJob(job));
  useEffect(() => {
    if (!inProgress) return;
    let cancelled = false;
    async function refresh() {
      try {
        const data = await api<{ jobs: Job[] }>("/api/jobs");
        if (cancelled) return;
        const stills = stillJobs(data.jobs);
        setJobs(stills);
        const latestPreview = stills.find((job) => job.previewUrl)?.previewUrl ?? null;
        if (latestPreview) setHeroUrl(latestPreview);
        const watched = watchingId ? stills.find((job) => job.id === watchingId) : undefined;
        if (!watched) return;
        if (watched.status === "failed") {
          setError(watched.lastError || "Generate failed. Try again.");
        } else if (watched.status === "canceled") {
          setError(null);
          setMessage(jobCanceledMessage("generate_still"));
        } else if (watched.status === "succeeded") {
          setError(null);
        }
      } catch {
        // Keep the last known in-progress row; the next tick retries.
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [inProgress, watchingId]);

  const selected = packs.find((pack) => pack.id === characterPackId);
  const locked = Boolean(selected && isLockedSoul(selected.status));
  const focus = spotlightPack(packs, props.initialPackId);
  const training = focus?.status === "training" || selected?.status === "training";
  const generateGate = { attested, locked, poseChipId };
  const canGenerate = canGenerateStill(generateGate);
  const disabledReason = generateDisabledReason(generateGate);
  const characterName = selected?.name;
  const activeJob = jobs.find((job) => isInProgressJob(job));
  const activeView = activeJob ? jobQueuePresentation(activeJob) : null;
  const generating = Boolean(activeJob);

  async function generate() {
    if (!canGenerate) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api<{ job: Job }>("/api/composer/generate", {
        method: "POST",
        body: JSON.stringify({
          characterPackId,
          poseChipId,
          outfitChipId: outfitChipId || null,
          sceneChipId: sceneChipId || null,
          lightingChipId: lightingChipId || null,
          bodyChipId: bodyChipId || null,
          aspectRatio,
        }),
      });
      setMessage("Still queued. Status updates here and on Jobs.");
      setWatchingId(result.job.id);
      setJobs((prev) => stillJobs([result.job, ...prev]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setPending(false);
    }
  }

  async function cancelJob(jobId: string) {
    setCancelingId(jobId);
    setError(null);
    try {
      const data = await api<{ job: Job }>(`/api/jobs/${jobId}/cancel`, { method: "POST" });
      setJobs((prev) => {
        const rest = prev.filter((job) => job.id !== jobId);
        return stillJobs([data.job, ...rest]);
      });
      setMessage(jobCanceledMessage("generate_still"));
      if (watchingId === jobId) setWatchingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel this still.");
    } finally {
      setCancelingId(null);
    }
  }

  const history = useMemo(
    () => jobs.filter((job) => job.kind === "generate_still"),
    [jobs],
  );

  if (!chips) {
    return <LoadingState label="Loading composer…" />;
  }

  return (
    <div>
      <div className="app-header">
        <SoulBadge name={characterName} locked={locked} />
        <span className="muted">Private · credits later</span>
      </div>
      <div className="composer-shell">
        <ChipRail
          packs={packs}
          chips={chips}
          characterPackId={characterPackId}
          poseChipId={poseChipId}
          outfitChipId={outfitChipId}
          sceneChipId={sceneChipId}
          lightingChipId={lightingChipId}
          bodyChipId={bodyChipId}
          aspectRatio={aspectRatio}
          lockPackId={focus?.id}
          training={training}
          onCharacter={setCharacterPackId}
          onPose={setPoseChipId}
          onOutfit={setOutfitChipId}
          onScene={setSceneChipId}
          onLighting={setLightingChipId}
          onBody={setBodyChipId}
          onAspect={setAspectRatio}
        />
        <div className="hero-canvas">
          <HeroCanvas
            locked={locked}
            message={message}
            progress={activeView?.note ?? null}
            previewUrl={heroUrl}
            packId={focus?.id}
            training={training}
            generating={generating}
            aspectRatio={aspectRatio}
          />
          {error ? <p className="error">{error}</p> : null}
          {activeView ? (
            <p className="job-status is-gold" aria-live="polite">
              {activeView.statusLabel}
              {activeView.meta ? ` · ${activeView.meta}` : ""}
              {activeView.note ? ` — ${activeView.note}` : ""}
            </p>
          ) : null}
          {disabledReason ? <p className="generate-reason">{disabledReason}</p> : null}
          <div className="actions" style={{ marginTop: 0 }}>
            <GenerateButton
              disabled={!canGenerate}
              pending={pending}
              inProgress={generating}
              disabledReason={disabledReason}
              onClick={() => void generate()}
            />
            {activeJob?.cancelSupported ? (
              <button
                className="btn secondary"
                type="button"
                disabled={cancelingId === activeJob.id}
                onClick={() => void cancelJob(activeJob.id)}
              >
                {cancelingId === activeJob.id ? "Canceling…" : "Cancel"}
              </button>
            ) : null}
            <TeaserAnimateLater />
          </div>
          <p className="hidden-note">
            Generate needs a Locked Soul ID and a Pose. No prompt textarea. No camera. No Advanced.
            Starters live in the Pack wizard only. Animate later is Phase 1.5.
          </p>
        </div>
        <aside className="history-rail">
          <h4>History</h4>
          {history.length === 0 ? (
            <EmptyState
              compact
              kicker="Session"
              title="No stills yet"
              body="Generate a still and it lands here."
            />
          ) : null}
          {history.map((job) => {
            const view = jobQueuePresentation(job);
            const busy = isInProgressJob(job);
            return (
              <div key={job.id} className={busy ? "history-item is-progress" : "history-item"}>
                {job.previewUrl ? (
                  <button type="button" className="history-thumb" onClick={() => setHeroUrl(job.previewUrl ?? null)}>
                    <StillPreview src={job.previewUrl} alt="Still" />
                  </button>
                ) : (
                  <p>
                    <span
                      className={
                        view.statusTone === "gold"
                          ? "job-status is-gold"
                          : view.statusTone === "danger"
                            ? "job-status is-danger"
                            : "job-status"
                      }
                    >
                      {view.statusLabel}
                    </span>
                    {view.meta ? <span className="muted"> · {view.meta}</span> : null}
                    {view.note ? (
                      <>
                        <br />
                        <span
                          className={
                            view.noteTone === "fail"
                              ? "error"
                              : view.noteTone === "retry"
                                ? "job-note is-retry"
                                : "muted"
                          }
                        >
                          {view.note}
                        </span>
                      </>
                    ) : null}
                  </p>
                )}
                {job.cancelSupported ? (
                  <button
                    className="btn secondary compact"
                    type="button"
                    disabled={cancelingId === job.id}
                    onClick={() => void cancelJob(job.id)}
                  >
                    {cancelingId === job.id ? "Canceling…" : "Cancel"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
