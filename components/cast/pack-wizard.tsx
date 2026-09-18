"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ContactSheet } from "@/components/cast/contact-sheet";
import { FictionalBadge } from "@/components/cast/soul-badge";
import { PlaceholderThumb } from "@/components/cast/placeholder-thumb";
import { RefCountMeter } from "@/components/cast/ref-count-meter";
import { StillPreview } from "@/components/still-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/client";
import { PACK_MIN_REFS } from "@/lib/constants";
import { soulStatusLabel } from "@/lib/soul";
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
    <section className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">New character</p>
          <h1 className="mt-1 font-heading text-4xl">{pack?.name || "Character Pack"}</h1>
        </div>
        <FictionalBadge />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Status: {status}. No device face upload. Starters are not Composer templates.
      </p>

      <div className="mt-6 space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={Boolean(pack)}
          required
        />
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as "starters" | "library")} className="mt-8">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="starters">Starters</TabsTrigger>
          <TabsTrigger value="library">From library</TabsTrigger>
        </TabsList>
        <TabsContent value="starters" className="mt-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Generate face and body vibes, pick at least {PACK_MIN_REFS} stills, then Train & lock Soul ID.
          </p>
          <div>
            <h3 className="mb-3 font-heading text-xl">Face starters</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(catalog?.face ?? []).map((preset) => (
                <button
                  key={preset.id}
                  className="overflow-hidden rounded-[var(--radius-chip)] border border-border text-left transition-colors duration-200 ease-out hover:border-primary/50 disabled:opacity-50"
                  type="button"
                  disabled={pending || training}
                  onClick={() => void generateStarter(preset.id)}
                >
                  <PlaceholderThumb id={preset.id} family="starter-face" label={preset.label} />
                  <span className="block px-2 py-1.5 text-xs">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-heading text-xl">Body starters</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(catalog?.body ?? []).map((preset) => (
                <button
                  key={preset.id}
                  className="overflow-hidden rounded-[var(--radius-chip)] border border-border text-left transition-colors duration-200 ease-out hover:border-primary/50 disabled:opacity-50"
                  type="button"
                  disabled={pending || training}
                  onClick={() => void generateStarter(preset.id)}
                >
                  <PlaceholderThumb id={preset.id} family="starter-body" label={preset.label} />
                  <span className="block px-2 py-1.5 text-xs">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-heading text-xl">Contact sheet</h3>
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
        </TabsContent>
        <TabsContent value="library" className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Pick in-app stills you already made in Create. Device uploads are not available.
          </p>
          {library.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Library is empty until you generate stills in Create with a Locked pack.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {library.map((item) => {
                const selected = selectedLibrary.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "overflow-hidden rounded-[var(--radius-chip)] border border-border text-left",
                      selected && "border-primary ring-2 ring-primary",
                    )}
                    disabled={training}
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
                      <StillPreview src={item.previewUrl} alt="Library still" className="still-thumb aspect-square" />
                    ) : (
                      <PlaceholderThumb id={item.id} family="character" label="Still" />
                    )}
                    <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                      {selected ? "Selected" : "Tap to add"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-8 space-y-4">
        <RefCountMeter count={refCount} />
        {training ? <p className="text-sm text-success">Training Soul ID… this page updates when it locks.</p> : null}
        {message ? <p className="text-sm text-success">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" size="xl" disabled={!canTrain || pending} onClick={() => void trainAndLock()}>
          {training ? "Training…" : "Train & lock Soul ID"}
        </Button>
      </div>
    </section>
  );
}
