"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ContactSheet } from "@/components/contact-sheet";
import { DemoBadge, DemoPackBanner } from "@/components/demo-pack-banner";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { RefCountMeter } from "@/components/ref-count-meter";
import { RefTray, type TrayRef } from "@/components/ref-tray";
import { RefUploader } from "@/components/ref-uploader";
import { StillPreview } from "@/components/still-preview";
import { api } from "@/lib/client";
import { PACK_MIN_REFS } from "@/lib/constants";
import { moveRefId } from "@/lib/pack-ref-order";
import { soulStatusLabel } from "@/lib/soul";

type Preset = { id: string; kind: string; label: string };
type Pack = {
  id: string;
  name: string;
  status: string;
  origin: string;
  hasAdapter?: boolean;
  demo?: boolean;
  demoState?: "locked" | "draft";
  summary?: string;
};
type Starter = { id: string; presetId: string | null; vibeKind: string; selected: boolean; previewUrl?: string | null };
type LibraryItem = { id: string; kind: string; previewUrl?: string | null };
type PackRef = TrayRef & { mediaAssetId: string };

export function PackWizard(props: { initialPackId?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"starters" | "library">("starters");
  const [name, setName] = useState("");
  const [pack, setPack] = useState<Pack | null>(null);
  const [catalog, setCatalog] = useState<{ face: Preset[]; body: Preset[] } | null>(null);
  const [starters, setStarters] = useState<Starter[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<Set<string>>(new Set());
  const [refs, setRefs] = useState<PackRef[]>([]);
  const [refCount, setRefCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingRefId, setPendingRefId] = useState<string | null>(null);
  const [awaitingStarters, setAwaitingStarters] = useState(false);
  const [loadingPack, setLoadingPack] = useState(Boolean(props.initialPackId));

  async function loadPack(id: string) {
    const data = await api<{
      pack: Pack;
      refCount: number;
      starters: Starter[];
      library: LibraryItem[];
      refs: PackRef[];
    }>(`/api/packs/${id}`);
    setPack(data.pack);
    setName(data.pack.name);
    setRefCount(data.refCount);
    setStarters(data.starters);
    setLibrary(data.library);
    setRefs(data.refs);
    setSelectedLibrary(new Set(data.refs.map((ref) => ref.mediaAssetId)));
    return data.pack;
  }

  useEffect(() => {
    void api<{ face: Preset[]; body: Preset[] }>("/api/generate-starters/catalog").then(setCatalog);
    if (props.initialPackId) {
      void loadPack(props.initialPackId)
        .then((loaded) => {
          if (loaded.origin === "library_train") setTab("library");
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Failed to load pack");
        })
        .finally(() => setLoadingPack(false));
    }
  }, [props.initialPackId]);

  useEffect(() => {
    if (!pack) return;
    if (pack.status === "locked" || pack.status === "ready" || pack.status === "training") {
      router.push(`/app/characters/${pack.id}`);
      return;
    }
    if (!awaitingStarters) return;
    const timer = window.setInterval(() => {
      void loadPack(pack.id);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [pack?.id, pack?.status, awaitingStarters, router]);

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
    router.replace(`/app/characters/${created.pack.id}`);
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
      setAwaitingStarters(true);
      window.setTimeout(() => setAwaitingStarters(false), 45_000);
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
    setPendingRefId(input.mediaAssetId);
    try {
      const result = await api<{ refCount: number }>(`/api/packs/${pack.id}/refs`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      setRefCount(result.refCount);
      await loadPack(pack.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update refs");
    } finally {
      setPendingRefId(null);
    }
  }

  async function removeRef(mediaAssetId: string) {
    const fromStarter = starters.find((row) => row.id === mediaAssetId);
    await toggleRef({
      mediaAssetId,
      selected: false,
      kind: fromStarter ? (fromStarter.vibeKind === "body" ? "starter_body" : "starter_face") : "still",
      source: fromStarter ? "generate_starter" : "in_app_still",
      starterPresetId: fromStarter?.presetId,
    });
  }

  async function moveRef(mediaAssetId: string, delta: -1 | 1) {
    if (!pack) return;
    const next = moveRefId(
      refs.map((ref) => ref.mediaAssetId),
      mediaAssetId,
      delta,
    );
    if (next.join() === refs.map((ref) => ref.mediaAssetId).join()) return;
    setError(null);
    setPendingRefId(mediaAssetId);
    try {
      await api(`/api/packs/${pack.id}/refs`, {
        method: "PATCH",
        body: JSON.stringify({ order: next }),
      });
      await loadPack(pack.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder pictures");
    } finally {
      setPendingRefId(null);
    }
  }

  async function trainAndLock() {
    if (!pack) return;
    setError(null);
    setPending(true);
    try {
      const result = await api<{ job: { id: string } }>(`/api/packs/${pack.id}/train`, { method: "POST" });
      setMessage(`Training Soul ID (${result.job.id}). Lock Soul ID first — Generate stays off until Locked.`);
      router.push(`/app/characters/${pack.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Train & lock failed");
    } finally {
      setPending(false);
    }
  }

  const demo = Boolean(pack?.demo);
  const status = pack ? soulStatusLabel(pack.status) : "Draft";
  const training = pack?.status === "training";
  const canTrain =
    Boolean(pack) &&
    !demo &&
    refCount >= PACK_MIN_REFS &&
    (pack?.status === "draft" || pack?.status === "failed") &&
    !training;

  if (loadingPack) {
    return <LoadingState label="Loading character pack…" />;
  }

  return (
    <section>
      <div className="row-between">
        <div>
          <div className="kicker">New character</div>
          <h1>{pack?.name || "Character Pack"}</h1>
        </div>
        <div className="roster-badges">
          {demo ? <DemoBadge /> : null}
          <span className="fictional-badge">Fictional only</span>
        </div>
      </div>
      {demo ? <DemoPackBanner state="draft" /> : null}
      <p className="muted">
        Status: {status}. Add fictional reference pictures, then Train & lock Soul ID. Starters are not
        Composer templates.
      </p>

      <label htmlFor="name">Name</label>
      <input
        id="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={Boolean(pack)}
        required
      />

      <RefUploader
        packId={pack?.id}
        refCount={refCount}
        disabled={pending || training || demo}
        onNeedPack={ensurePack}
        onUploaded={async (packId) => {
          await loadPack(packId);
        }}
        onError={(message) => setError(message || null)}
      />

      <h3>Selected</h3>
      <RefTray
        refs={refs}
        pendingId={pendingRefId}
        readOnly={demo}
        onRemove={(id) => void removeRef(id)}
        onMove={(id, delta) => void moveRef(id, delta)}
      />

      <div className="tabs">
        <button
          type="button"
          className={tab === "starters" ? "tab active" : "tab"}
          onClick={() => setTab("starters")}
        >
          Starters
        </button>
        <button
          type="button"
          className={tab === "library" ? "tab active" : "tab"}
          onClick={() => setTab("library")}
        >
          From library
        </button>
      </div>

      {tab === "starters" ? (
        <>
          <p className="muted">
            Generate face and body vibes, then tap stills onto the sheet. Pick at least {PACK_MIN_REFS} to
            lock.
          </p>
          <h3>Face starters</h3>
          <div className="chips">
            {(catalog?.face ?? []).map((preset) => (
              <button
                key={preset.id}
                className="chip"
                type="button"
                disabled={pending || training || demo}
                onClick={() => void generateStarter(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <h3>Body starters</h3>
          <div className="chips">
            {(catalog?.body ?? []).map((preset) => (
              <button
                key={preset.id}
                className="chip"
                type="button"
                disabled={pending || training || demo}
                onClick={() => void generateStarter(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <h3>Contact sheet</h3>
          {awaitingStarters ? <LoadingState compact label="Waiting for starter stills…" /> : null}
          <ContactSheet
            tiles={starters}
            onToggle={(id, selected, vibeKind, presetId) => {
              if (demo) return;
              void toggleRef({
                mediaAssetId: id,
                selected,
                kind: vibeKind === "body" ? "starter_body" : "starter_face",
                source: "generate_starter",
                starterPresetId: presetId,
              });
            }}
          />
        </>
      ) : (
        <>
          <p className="muted">Pick in-app stills you already made in Create.</p>
          {library.length === 0 ? (
            <EmptyState
              kicker="Library"
              title="No stills yet"
              body="Generate in Create with a Locked pack, then those stills can join this training set."
              action={{ href: "/app/create", label: "Open Create" }}
            />
          ) : (
            <div className="contact-sheet">
              {library.map((item) => {
                const selected = selectedLibrary.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={selected ? "sheet-tile selected" : "sheet-tile"}
                    disabled={training || demo}
                    onClick={() =>
                      void toggleRef({
                        mediaAssetId: item.id,
                        selected: !selected,
                        kind: "still",
                        source: "in_app_still",
                      })
                    }
                  >
                    {item.previewUrl ? (
                      <StillPreview src={item.previewUrl} alt="Library still" />
                    ) : (
                      <span className="muted">Still</span>
                    )}
                    <div className="muted">{selected ? "Selected" : "Tap to add"}</div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <RefCountMeter count={refCount} />
      {training ? <p className="ok">Training Soul ID… this page updates when it locks.</p> : null}
      {message ? <p className="ok">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <button className="btn" type="button" disabled={!canTrain || pending} onClick={() => void trainAndLock()}>
        {training ? "Training…" : demo ? "Demo pack — lock on your own" : "Train & lock Soul ID"}
      </button>
    </section>
  );
}
