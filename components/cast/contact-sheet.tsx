"use client";

import { PlaceholderThumb } from "@/components/cast/placeholder-thumb";
import { StillPreview } from "@/components/still-preview";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

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
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {props.tiles.map((tile) => (
        <button
          key={tile.id}
          type="button"
          className={cn(
            "relative overflow-hidden rounded-[var(--radius-chip)] border border-border bg-muted text-left transition-colors duration-200 ease-out",
            tile.selected && "border-primary ring-2 ring-primary/70",
          )}
          onClick={() => props.onToggle(tile.id, !tile.selected, tile.vibeKind, tile.presetId)}
        >
          {tile.previewUrl ? (
            <StillPreview src={tile.previewUrl} alt={`${tile.vibeKind} starter`} className="still-thumb aspect-square" />
          ) : (
            <PlaceholderThumb
              id={tile.presetId ?? tile.id}
              family={tile.vibeKind === "body" ? "starter-body" : "starter-face"}
              label={tile.presetId ?? "starter"}
            />
          )}
          {tile.selected ? (
            <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-3" />
            </span>
          ) : null}
          <span className="block truncate px-2 py-1.5 text-[11px] text-muted-foreground">
            {tile.selected ? "Selected" : (tile.presetId ?? "starter")}
          </span>
        </button>
      ))}
    </div>
  );
}
