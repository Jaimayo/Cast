"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Chip = { id: string; label: string };
type Pack = { id: string; name: string; status: string };

export default function ComposerPage() {
  const [chips, setChips] = useState<{
    pose: Chip[];
    outfit: Chip[];
    scene: Chip[];
    lighting: Chip[];
    body: Chip[];
  } | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
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
    ]).then(([chipData, packData]) => {
      setChips(chipData);
      setPacks(packData.packs);
      setCharacterPackId(packData.packs[0]?.id ?? "");
      setPoseChipId(chipData.pose[0]?.id ?? "");
      setOutfitChipId(chipData.outfit[0]?.id ?? "");
      setSceneChipId(chipData.scene[0]?.id ?? "");
      setLightingChipId(chipData.lighting[0]?.id ?? "");
    });
  }, []);

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
          outfitChipId,
          sceneChipId,
          lightingChipId,
          bodyChipId: bodyChipId || null,
        }),
      });
      setMessage(`Queued generateStill job ${result.job.id}. Prompt stays hidden.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setPending(false);
    }
  }

  if (!chips) {
    return <p className="muted">Loading composer…</p>;
  }

  return (
    <section>
      <div className="row-between">
        <div>
          <div className="kicker">Composer</div>
          <h1>Hero still</h1>
        </div>
        <button className="btn secondary" type="button" disabled title="Phase 1.5 teaser">
          Animate later
        </button>
      </div>
      <p className="hidden-note">
        No raw prompt box. No camera. No Advanced panel. Chips compile to a hidden prompt on the
        server.
      </p>

      <label htmlFor="pack">Character Pack (required)</label>
      <select
        id="pack"
        value={characterPackId}
        onChange={(event) => setCharacterPackId(event.target.value)}
      >
        <option value="">Select a pack…</option>
        {packs.map((pack) => (
          <option key={pack.id} value={pack.id}>
            {pack.name} · {pack.status}
          </option>
        ))}
      </select>

      <ChipRow title="Pose" chips={chips.pose} value={poseChipId} onChange={setPoseChipId} />
      <ChipRow title="Outfit" chips={chips.outfit} value={outfitChipId} onChange={setOutfitChipId} />
      <ChipRow title="Scene" chips={chips.scene} value={sceneChipId} onChange={setSceneChipId} />
      <ChipRow
        title="Lighting"
        chips={chips.lighting}
        value={lightingChipId}
        onChange={setLightingChipId}
      />
      <ChipRow
        title="Body (optional lock)"
        chips={chips.body}
        value={bodyChipId}
        onChange={setBodyChipId}
        optional
      />

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
      <div className="actions">
        <button className="btn" type="button" onClick={() => void generate()} disabled={pending || !characterPackId}>
          {pending ? "Queueing…" : "Generate still"}
        </button>
      </div>
    </section>
  );
}

function ChipRow(props: {
  title: string;
  chips: Chip[];
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <h3>{props.title}</h3>
      <div className="chips">
        {props.optional ? (
          <button
            type="button"
            className={props.value === "" ? "chip selected" : "chip"}
            onClick={() => props.onChange("")}
          >
            Unset
          </button>
        ) : null}
        {props.chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={props.value === chip.id ? "chip selected" : "chip"}
            onClick={() => props.onChange(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
