"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { DemoBadge } from "@/components/demo-pack-banner";
import { StillPreview } from "@/components/still-preview";
import {
  LIBRARY_CLOSE_LABEL,
  LIBRARY_DETAIL_KICKER,
  LIBRARY_NEXT_LABEL,
  LIBRARY_PREV_LABEL,
  LIBRARY_USE_IN_PACK_HREF,
  LIBRARY_USE_IN_PACK_LABEL,
  adjacentLibraryStillId,
  libraryDownloadAffordance,
  libraryShareAffordance,
  libraryStillPresentation,
  type LibraryStillInput,
} from "@/lib/library-still";

const DOWNLOAD = libraryDownloadAffordance();
const SHARE = libraryShareAffordance();

export function LibrarySheet(props: { stills: LibraryStillInput[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ids = useMemo(() => props.stills.map((still) => still.id), [props.stills]);
  const stillKey = ids.join(",");
  const selected = props.stills.find((still) => still.id === selectedId) ?? null;
  const view = selected ? libraryStillPresentation(selected) : null;
  const prevId = adjacentLibraryStillId(ids, selectedId, -1);
  const nextId = adjacentLibraryStillId(ids, selectedId, 1);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("still");
    const known = stillKey.split(",").filter(Boolean);
    if (fromUrl && known.includes(fromUrl)) {
      setSelectedId(fromUrl);
    }
  }, [stillKey]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedId && !dialog.open) dialog.showModal();
    if (!selectedId && dialog.open) dialog.close();
  }, [selectedId]);

  function select(id: string | null) {
    setSelectedId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("still", id);
    else url.searchParams.delete("still");
    window.history.replaceState({}, "", url);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (!selectedId) return;
    if (event.key === "ArrowLeft" && prevId && prevId !== selectedId) {
      event.preventDefault();
      select(prevId);
    }
    if (event.key === "ArrowRight" && nextId && nextId !== selectedId) {
      event.preventDefault();
      select(nextId);
    }
  }

  return (
    <>
      <div className="contact-sheet library-sheet">
        {props.stills.map((still) => {
          const tile = libraryStillPresentation(still);
          const active = still.id === selectedId;
          return (
            <button
              key={still.id}
              type="button"
              className={["sheet-tile", still.demo ? "is-demo" : "", active ? "is-open" : ""]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={active}
              onClick={() => select(still.id)}
            >
              <StillPreview src={still.previewUrl} alt={tile.alt} label={tile.title} />
              <div className="muted">{tile.tileCaption}</div>
            </button>
          );
        })}
      </div>

      <dialog
        ref={dialogRef}
        className="library-lightbox"
        aria-labelledby="library-lightbox-title"
        onClose={() => select(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) select(null);
        }}
        onKeyDown={onKeyDown}
      >
        {view ? (
          <div className="library-lightbox-body">
            <div className="library-lightbox-frame">
              <StillPreview src={view.previewUrl} alt={view.alt} label={view.title} className="still-thumb library-detail-thumb" />
            </div>
            <aside className="library-lightbox-meta">
              <div className="row-between">
                <p className="kicker">{LIBRARY_DETAIL_KICKER}</p>
                <button className="btn secondary compact" type="button" onClick={() => select(null)}>
                  {LIBRARY_CLOSE_LABEL}
                </button>
              </div>
              <h2 id="library-lightbox-title">{view.title}</h2>
              {view.badge ? <DemoBadge label={view.badge} /> : null}
              <dl className="library-meta">
                <div>
                  <dt>Character</dt>
                  <dd>{view.packLine}</dd>
                </div>
                <div>
                  <dt>Frame</dt>
                  <dd>{view.aspectLabel}</dd>
                </div>
                <div>
                  <dt>Kind</dt>
                  <dd>{view.kindLabel}</dd>
                </div>
                {view.createdLabel ? (
                  <div>
                    <dt>Stored</dt>
                    <dd>{view.createdLabel}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="muted">{view.privacy}</p>
              {view.placeholderNote ? <p className="muted">{view.placeholderNote}</p> : null}
              <div className="actions library-lightbox-actions">
                <button className="btn secondary" type="button" disabled title={DOWNLOAD.reason}>
                  {DOWNLOAD.label}
                </button>
                <button className="btn secondary" type="button" disabled title={SHARE.reason}>
                  {SHARE.label}
                </button>
                <a className="btn" href={LIBRARY_USE_IN_PACK_HREF}>
                  {LIBRARY_USE_IN_PACK_LABEL}
                </a>
              </div>
              <div className="library-lightbox-nav">
                <button
                  className="btn secondary compact"
                  type="button"
                  disabled={prevId === selectedId}
                  onClick={() => prevId && select(prevId)}
                >
                  {LIBRARY_PREV_LABEL}
                </button>
                <button
                  className="btn secondary compact"
                  type="button"
                  disabled={nextId === selectedId}
                  onClick={() => nextId && select(nextId)}
                >
                  {LIBRARY_NEXT_LABEL}
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
