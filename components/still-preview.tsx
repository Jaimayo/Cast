"use client";

import { useEffect, useState } from "react";
import { mediaPreviewRefreshPath } from "@/lib/media";
import { cn } from "@/lib/utils";

function mediaIdFromPreviewSrc(src: string): string | null {
  try {
    const url = new URL(src, "http://cast.local");
    const match = url.pathname.match(/^\/api\/media\/([^/]+)$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

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
      <div className={cn("flex min-h-20 flex-col items-center justify-center gap-1 bg-muted p-3 text-center", props.className)}>
        <strong className="text-xs font-medium text-foreground">{props.alt}</strong>
        {props.label ? <div className="text-[11px] text-muted-foreground">{props.label}</div> : null}
        {failed ? <div className="text-[11px] text-muted-foreground">Preview unavailable</div> : null}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cn("block object-cover", props.className)}
      src={src}
      alt={props.alt}
      onError={() => {
        const mediaId = mediaIdFromPreviewSrc(src);
        if (!refreshed && mediaId) {
          setRefreshed(true);
          setSrc(mediaPreviewRefreshPath(mediaId));
          return;
        }
        setFailed(true);
      }}
    />
  );
}
