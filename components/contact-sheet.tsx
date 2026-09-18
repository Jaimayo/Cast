"use client";

import { chipSwatch } from "@/lib/chip-visuals";

type Tile = {
  id: string;
  presetId: string | null;
  vibeKind: string;
  selected: boolean;
};

export function ContactSheet(props: {
  tiles: Tile[];
  onToggle: (id: string, selected: boolean, vibeKind: string, presetId: string | null) => void;
}) {
  if (props.tiles.length === 0) {
    return (
      <div className="empty-sheet">
        <p className="muted">No starter stills yet. Generate face or body vibes above — they land here as a contact sheet.</p>
      </div>
    );
  }
  return (
    <div className="contact-sheet">
      {props.tiles.map((tile) => {
        const family = tile.vibeKind === "body" ? "body" : "pose";
        const swatch = chipSwatch(family, tile.presetId ?? tile.id);
        return (
          <button
            key={tile.id}
            type="button"
            className={tile.selected ? "sheet-tile selected" : "sheet-tile"}
            onClick={() => props.onToggle(tile.id, !tile.selected, tile.vibeKind, tile.presetId)}
          >
            <span className="sheet-art" style={{ background: `linear-gradient(152deg, ${swatch.from}, ${swatch.to})` }} />
            <strong>{tile.vibeKind === "body" ? "Body" : "Face"}</strong>
            <div className="muted">{tile.presetId ?? "starter"}</div>
            <div className="muted">{tile.selected ? "Selected" : "Tap to select"}</div>
          </button>
        );
      })}
    </div>
  );
}
