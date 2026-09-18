"use client";

import { ElasticGallery } from "@/components/elastic-gallery";

type Tile = {
  id: string;
  presetId: string | null;
  vibeKind: string;
  selected: boolean;
  previewUrl?: string | null;
};

export function ContactSheet(props: {
  tiles: Tile[];
  onToggle: (id: string, selected: boolean, vibeKind: string, presetId: string | null) => void;
}) {
  const byId = new Map(props.tiles.map((tile) => [tile.id, tile]));
  return (
    <ElasticGallery
      items={props.tiles.map((tile) => ({
        id: tile.id,
        src: tile.previewUrl,
        alt: `${tile.vibeKind} starter`,
        label: tile.presetId ?? tile.vibeKind,
        selected: tile.selected,
      }))}
      onSelect={(id) => {
        const tile = byId.get(id);
        if (!tile) return;
        props.onToggle(tile.id, !tile.selected, tile.vibeKind, tile.presetId);
      }}
      empty={<p className="text-sm text-muted-foreground">No starter stills yet. Generate face or body vibes above.</p>}
    />
  );
}
