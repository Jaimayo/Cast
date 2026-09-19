"use client";

import { StillPreview } from "@/components/still-preview";

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
    return (
      <div className="empty-state is-compact" role="status">
        <div className="empty-state-mark" aria-hidden="true" />
        <h2>Contact sheet is empty</h2>
        <p className="muted">Generate a face or body vibe above. Stills land here so you can add them as references.</p>
      </div>
    );
  }
  return (
    <div className="contact-sheet">
      {props.tiles.map((tile) => (
        <button
          key={tile.id}
          type="button"
          className={tile.selected ? "sheet-tile selected" : "sheet-tile"}
          onClick={() => props.onToggle(tile.id, !tile.selected, tile.vibeKind, tile.presetId)}
        >
          <StillPreview src={tile.previewUrl} alt={`${tile.vibeKind} starter`} label={tile.presetId ?? "starter"} />
          {tile.previewUrl ? <div className="muted">{tile.presetId ?? "starter"}</div> : null}
          <div className="muted">{tile.selected ? "Selected" : "Tap to select"}</div>
        </button>
      ))}
    </div>
  );
}
