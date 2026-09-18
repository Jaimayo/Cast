"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ContactSheet } from "@/components/contact-sheet";
import { RefCountMeter } from "@/components/ref-count-meter";
import { api } from "@/lib/client";
import { chipSwatch } from "@/lib/chip-visuals";
import { PACK_MIN_REFS } from "@/lib/constants";
import { soulStatusLabel } from "@/lib/soul";

type Preset = { id: string; kind: string; label: string };
type Pack = { id: string; name: string; status: string; origin: string };
type Starter = { id: string; presetId: string | null; vibeKind: string; selected: boolean };
type LibraryItem = { id: string; kind: string; storageKey: string };

type Ref = { mediaAssetId: string };

export function PackWizard(props: { initialPackId?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"starters" | "library">("starters");
  const [name, setName] = useState("");
  const [pack, setPack] = useState<Pack | null>(null);
  const [catalog, setCatalog] = useState<{ face: Preset[]; body: Preset[] } | null>(null);
  const [starters, setStarters] = useState<Starter[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<Set<string>>(new Set());
  const [refCount, setRefCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function loadPack(id: string) {
    const data = await api<{
      pack: Pack;
      refCount: number;
      starters: Starter[];
      library: LibraryItem[];
      refs: Ref[];
    }>(`/api/packs/${id}`);
    setPack(data.pack);
    setName(data.pack.name);
    setRefCount(data.refCount);
    setStarters(data.starters);
    setLibrary(data.library);
    setSelectedLibrary(new Set(data.refs.map((ref) => ref.mediaAssetId)));
  }

  useEffect(() => {
    void api<{ face: Preset[]; body: Preset[] }>("/api/generate-starters/catalog").then(setCatalog);
    if (props.initialPackId) {
      void loadPack(props.initialPackId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load pack");
      });
    }
  }, [props.initialPackId]);

  async function ensurePack(): Promise<string> {
    if (pack) return pack.id;
    if (!name.trim()) {
      throw new Error("Name is required");
    }
    const created = await api<{ pack: Pack }>("/api/packs", {
      method: "POST",
      body: JSON.stringify({
        name,
        origin: tab === "library" ? "library_train" : "generate_then_lock",
      }),
    });
    setPack(created.pack);
    return created.pack.id;
  }

  async function generateStarter(presetId: string) {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const packId = await ensurePack();
      const result = await api<{ job: { id: string }; preset: Preset }>("/api/generate-starters", {
        method: "POST",
        body: JSON.stringify({ characterPackId: packId, presetId }),
      });
      setMessage(`Queued ${result.preset.label}. Select stills on the contact sheet once they land.`);
      window.setTimeout(() => {
        void loadPack(packId);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Starter failed");
    } finally {
      setPending(false);
    }
  }

  async function toggleRef(input: {
    mediaAssetId: string;
    selected: boolean;
    kind: "still" | "starter_face" | "starter_body";
    source: "in_app_still" | "generate_starter";
    starterPresetId?: string | null;
  }) {
    if (!pack) return;
    setError(null);
    try {
      const result = await api<{ refCount: number }>(`/api/packs/${pack.id}/refs`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      setRefCount(result.refCount);
      await loadPack(pack.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update refs");
    }
  }

  async function trainAndLock() {
    if (!pack) return;
    setError(null);
    setPending(true);
    try {
      const result = await api<{ job: { id: string } }>(`/api/packs/${pack.id}/train`, { method: "POST" });
      setMessage(`Training Soul ID (${result.job.id}). Generate unlocks when status is Locked.`);
      window.setTimeout(() => {
        void loadPack(pack.id).then(() => router.push(`/app/characters/${pack.id}`));
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Train & lock failed");
    } finally {
      setPending(false);
    }
  }

  const status = pack ? soulStatusLabel(pack.status) : "Draft";
  const canTrain = Boolean(pack) && refCount >= PACK_MIN_REFS && (pack?.status === "draft" || pack?.status === "failed");

  return (
    <section className="page-section wizard">
      <div className="row-between">
        <div>
          <div className="kicker">New character</div>
          <h1>{pack?.name || "Character Pack"}</h1>
        </div>
        <span className="fictional-badge" title="Cannot be removed">
          Fictional only
        </span>
      </div>
      <p className="lede-sm">
        Status: {status}. No device face upload. Face/body vibes are Generate-starters — they are not Composer
        templates.
      </p>

      <div className="card wizard-name">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={Boolean(pack)}
          placeholder="A fictional adult name"
          required
        />
      </div>

      <div className="tabs">
        <button type="button" className={tab === "starters" ? "tab active" : "tab"} onClick={() => setTab("starters")}>
          Starters
        </button>
        <button type="button" className={tab === "library" ? "tab active" : "tab"} onClick={() => setTab("library")}>
          From library
        </button>
      </div>

      {tab === "starters" ? (
        <>
          <h3>Face starters</h3>
          <p className="muted">Tap a vibe to queue a training still. Select tiles on the contact sheet.</p>
          <StarterVibeRow
            kind="face"
            presets={catalog?.face ?? []}
            pending={pending}
            onPick={(id) => void generateStarter(id)}
          />
          <h3>Body starters</h3>
          <StarterVibeRow
            kind="body"
            presets={catalog?.body ?? []}
            pending={pending}
            onPick={(id) => void generateStarter(id)}
          />
          <h3>Contact sheet</h3>
          <ContactSheet
            tiles={starters}
            onToggle={(id, selected, vibeKind, presetId) =>
              void toggleRef({
                mediaAssetId: id,
                selected,
                kind: vibeKind === "body" ? "starter_body" : "starter_face",
                source: "generate_starter",
                starterPresetId: presetId,
              })
            }
          />
        </>
      ) : (
        <>
          <p className="muted">Pick in-app stills only. Device uploads are not available.</p>
          {library.length === 0 ? (
            <div className="empty-sheet">
              <p className="muted">Library is empty until you generate stills in Create with a Locked pack.</p>
            </div>
          ) : (
            <div className="contact-sheet">
              {library.map((item) => {
                const selected = selectedLibrary.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={selected ? "sheet-tile selected" : "sheet-tile"}
                    onClick={() =>
                      void toggleRef({
                        mediaAssetId: item.id,
                        selected: !selected,
                        kind: "still",
                        source: "in_app_still",
                      })
                    }
                  >
                    {item.storageKey}
                    <div className="muted">{selected ? "Selected" : "Tap to add"}</div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="wizard-lock">
        <RefCountMeter count={refCount} />
        {message ? <p className="ok">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="button" disabled={!canTrain || pending} onClick={() => void trainAndLock()}>
          Train & lock Soul ID
        </button>
        <p className="muted">Generate in Create stays disabled until this pack is Locked.</p>
      </div>
    </section>
  );
}

function StarterVibeRow(props: {
  kind: "face" | "body";
  presets: Preset[];
  pending: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <div className="chip-thumb-grid starter-grid">
      {props.presets.map((preset) => {
        const swatch = chipSwatch(props.kind === "body" ? "body" : "pose", preset.id);
        return (
          <button
            key={preset.id}
            type="button"
            className="thumb-tile"
            disabled={props.pending}
            onClick={() => props.onPick(preset.id)}
          >
            <span
              className="thumb-art"
              style={{ background: `linear-gradient(152deg, ${swatch.from}, ${swatch.to})` }}
            />
            <span className="thumb-label">{preset.label}</span>
          </button>
        );
      })}
    </div>
  );
}
