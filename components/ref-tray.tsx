"use client";

import { EmptyState } from "@/components/empty-state";
import { StillPreview } from "@/components/still-preview";
import { PACK_MIN_REFS } from "@/lib/constants";

export type TrayRef = {
  mediaAssetId: string;
  previewUrl?: string | null;
  kind?: string;
};

export function RefTray(props: {
  refs: TrayRef[];
  readOnly?: boolean;
  pendingId?: string | null;
  onRemove?: (mediaAssetId: string) => void;
  onMove?: (mediaAssetId: string, delta: -1 | 1) => void;
}) {
  if (props.refs.length === 0) {
    return (
      <EmptyState
        kicker="Reference pictures"
        title="No pictures yet"
        body={`Add fictional stills — generate starters, pick from Library, or add JPEG / PNG / WebP files. ${PACK_MIN_REFS} are needed to lock Soul ID.`}
      />
    );
  }

  return (
    <div className="ref-tray" aria-label="Selected reference pictures">
      {props.refs.map((ref, index) => (
        <div
          key={ref.mediaAssetId}
          className={props.pendingId === ref.mediaAssetId ? "ref-tile is-pending" : "ref-tile"}
        >
          {ref.previewUrl ? (
            <StillPreview src={ref.previewUrl} alt={`Reference ${index + 1}`} />
          ) : (
            <span className="muted">Still</span>
          )}
          <div className="ref-tile-meta">
            <span className="muted">{index + 1}</span>
            {props.readOnly ? null : (
              <div className="ref-tile-actions">
                <button
                  type="button"
                  className="chip"
                  disabled={index === 0}
                  aria-label="Move earlier"
                  onClick={() => props.onMove?.(ref.mediaAssetId, -1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="chip"
                  disabled={index === props.refs.length - 1}
                  aria-label="Move later"
                  onClick={() => props.onMove?.(ref.mediaAssetId, 1)}
                >
                  →
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-label="Remove picture"
                  onClick={() => props.onRemove?.(ref.mediaAssetId)}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
