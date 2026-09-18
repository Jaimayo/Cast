"use client";

import { useEffect, useMemo, useState } from "react";
import { ChipRail } from "@/components/chip-rail";
import { GenerateButton, TeaserAnimateLater } from "@/components/generate-button";
import { HeroCanvas } from "@/components/hero-canvas";
import { SoulBadge } from "@/components/soul-badge";
import { api } from "@/lib/client";
import { isLockedSoul } from "@/lib/soul";

type Chip = { id: string; label: string };
type Pack = { id: string; name: string; status: string };
type Job = { id: string; kind: string; status: string };

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

  useEffect(() => {
    void Promise.all([
      api<{ pose: Chip[]; outfit: Chip[]; scene: Chip[]; lighting: Chip[]; body: Chip[] }>("/api/chips"),
      api<{ packs: Pack[] }>("/api/packs"),
      api<{ jobs: Job[] }>("/api/jobs").catch(() => ({ jobs: [] })),
    ]).then(([chipData, packData, jobData]) => {
      setChips(chipData);
      setPacks(packData.packs);
      setJobs(jobData.jobs.slice(0, 8));
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

  const selected = packs.find((pack) => pack.id === characterPackId);
  const locked = Boolean(selected && isLockedSoul(selected.status));
  const canGenerate = locked && Boolean(poseChipId);

  const characterName = selected?.name;

  async function generate() {
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
    return <p className="muted">Loading composer…</p>;
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
          onCharacter={setCharacterPackId}
          onPose={setPoseChipId}
          onOutfit={setOutfitChipId}
          onScene={setSceneChipId}
          onLighting={setLightingChipId}
          onBody={setBodyChipId}
        />
        <div className="hero-canvas">
          <HeroCanvas locked={locked} message={message} />
          {error ? <p className="error">{error}</p> : null}
          <div className="actions" style={{ marginTop: 0 }}>
            <GenerateButton disabled={!canGenerate} pending={pending} onClick={() => void generate()} />
            <TeaserAnimateLater />
          </div>
          <p className="hidden-note">No prompt textarea. No camera. No Advanced. Starters live in the Pack wizard only.</p>
        </div>
        <aside className="history-rail">
          <h4>History</h4>
          {history.length === 0 ? <p>Session stills will land here.</p> : null}
          {history.map((job) => (
            <p key={job.id}>
              {job.status} · {job.id.slice(0, 8)}
            </p>
          ))}
        </aside>
      </div>
    </div>
  );
}
