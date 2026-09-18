"use client";

import { StillPreview } from "@/components/still-preview";
import { cn } from "@/lib/utils";

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
  if (props.tiles.length === 0) {
    return <p className="text-sm text-muted-foreground">No starter stills yet. Generate face or body vibes above.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {props.tiles.map((tile) => (
        <button
          key={tile.id}
          type="button"
          className={cn(
            "relative overflow-hidden rounded-lg bg-muted p-0 text-left ring-1 ring-border",
            tile.selected && "ring-2 ring-primary",
          )}
          onClick={() => props.onToggle(tile.id, !tile.selected, tile.vibeKind, tile.presetId)}
        >
          <StillPreview
            src={tile.previewUrl}
            alt={`${tile.vibeKind} starter`}
            label={tile.presetId ?? "starter"}
            className="aspect-square w-full object-cover"
          />
          {tile.selected ? (
            <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              ✓
            </span>
          ) : null}
          <span className="sr-only">{tile.selected ? "Selected" : "Tap to select"}</span>
        </button>
      ))}
    </div>
  );
}
