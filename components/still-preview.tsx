"use client";

import { useEffect, useState } from "react";
import { stillPreviewRetrySrc } from "@/lib/media";

export function StillPreview(props: {
  src?: string | null;
  alt: string;
  label?: string;
  className?: string;
}) {
  const [src, setSrc] = useState(props.src ?? null);
  const [failed, setFailed] = useState(false);
  const [refreshed, setRefreshed] = useState(false);

  useEffect(() => {
    setSrc(props.src ?? null);
    setFailed(false);
    setRefreshed(false);
  }, [props.src]);

  if (!src || failed) {
    return (
      <div className="still-fallback">
        <strong>{props.alt}</strong>
        {props.label ? <div className="muted">{props.label}</div> : null}
        {failed ? <div className="muted">Preview unavailable</div> : null}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={props.className ?? "still-thumb"}
      src={src}
      alt={props.alt}
      onError={() => {
        const retry = stillPreviewRetrySrc(src, refreshed);
        if (retry) {
          setRefreshed(true);
          setSrc(retry);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
