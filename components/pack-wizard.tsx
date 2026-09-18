"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ContactSheet } from "@/components/contact-sheet";
import { RefCountMeter } from "@/components/ref-count-meter";
import { api } from "@/lib/client";
import { PACK_MIN_REFS } from "@/lib/constants";
import { soulStatusLabel } from "@/lib/soul";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetallicButton } from "@/components/metallic-button";
import { ElasticGallery } from "@/components/elastic-gallery";
import { cn } from "@/lib/utils";

type Preset = { id: string; kind: string; label: string };
type Pack = { id: string; name: string; status: string; origin: string; hasAdapter?: boolean };
type Starter = { id: string; presetId: string | null; vibeKind: string; selected: boolean; previewUrl?: string | null };
type LibraryItem = { id: string; kind: string; previewUrl?: string | null };
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
  const [awaitingStarters, setAwaitingStarters] = useState(false);

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
        });
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
      setMessage(`Training Soul ID (${result.job.id}). Lock Soul ID first — Generate stays off until Locked.`);
      router.push(`/app/characters/${pack.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Train & lock failed");
    } finally {
      setPending(false);
    }
  }

  const status = pack ? soulStatusLabel(pack.status) : "Draft";
  const training = pack?.status === "training";
  const canTrain =
    Boolean(pack) &&
    refCount >= PACK_MIN_REFS &&
    (pack?.status === "draft" || pack?.status === "failed") &&
    !training;

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-primary uppercase">New character</p>
          <h1 className="font-heading text-3xl">{pack?.name || "Character Pack"}</h1>
        </div>
        <StatusBadge status="outline" leftLabel="Fictional" rightLabel="only" />
      </div>
      <p className="text-sm text-muted-foreground">
        Status: {status}. No device face upload. Starters are not Composer templates.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="name" className="text-muted-foreground">
          Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={Boolean(pack)}
          required
          className="h-11 max-w-md rounded-xl bg-muted/40"
        />
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          className={cn(
            "cast-ease -mb-px border-b-2 px-4 py-2.5 text-sm",
            tab === "starters"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("starters")}
        >
          Starters
        </button>
        <button
          type="button"
          className={cn(
            "cast-ease -mb-px border-b-2 px-4 py-2.5 text-sm",
            tab === "library"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("library")}
        >
          From library
        </button>
      </div>

      {tab === "starters" ? (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Generate face and body vibes, pick at least {PACK_MIN_REFS} stills, then Train & lock Soul ID.
          </p>
          <div>
            <h3 className="mb-2 font-heading text-xl">Face starters</h3>
            <div className="flex flex-wrap gap-2">
              {(catalog?.face ?? []).map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  type="button"
                  disabled={pending || training}
                  className="rounded-full"
                  onClick={() => void generateStarter(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-heading text-xl">Body starters</h3>
            <div className="flex flex-wrap gap-2">
              {(catalog?.body ?? []).map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  type="button"
                  disabled={pending || training}
                  className="rounded-full"
                  onClick={() => void generateStarter(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-heading text-xl">Contact sheet</h3>
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
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pick in-app stills you already made in Create. Device uploads are not available.
          </p>
          <ElasticGallery
            items={library.map((item) => ({
              id: item.id,
              src: item.previewUrl,
              alt: "Library still",
              label: "Still",
              selected: selectedLibrary.has(item.id),
            }))}
            onSelect={
              training
                ? undefined
                : (id) => {
                    const selected = selectedLibrary.has(id);
                    void toggleRef({
                      mediaAssetId: id,
                      selected: !selected,
                      kind: "still",
                      source: "in_app_still",
                    });
                  }
            }
            empty={
              <p className="text-sm text-muted-foreground">
                Library is empty until you generate stills in Create with a Locked pack.
              </p>
            }
          />
        </div>
      )}

      <div className="cast-surface max-w-md space-y-4 rounded-xl p-4">
        <RefCountMeter count={refCount} />
        {training ? (
          <div className="space-y-2 text-center">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/80" />
            </div>
            <p className="text-sm text-success">Training Soul ID… this page updates when it locks.</p>
          </div>
        ) : null}
        {message ? <p className="text-sm text-success">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <MetallicButton
          type="button"
          disabled={!canTrain || pending}
          className="w-full"
          onClick={() => void trainAndLock()}
        >
          {training ? "Training…" : "Train & lock Soul ID"}
        </MetallicButton>
      </div>
    </section>
  );
}
