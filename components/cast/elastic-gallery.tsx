"use client";

import { useState } from "react";
import { PlaceholderThumb } from "@/components/cast/placeholder-thumb";
import { StatusBadge } from "@/components/cast/status-badge";
import { StillPreview } from "@/components/still-preview";
import { cn } from "@/lib/utils";

type Still = { id: string; previewUrl?: string | null; label?: string };

export function ElasticGallery(props: { stills: Still[] }) {
  const items: Still[] =
    props.stills.length > 0
      ? props.stills.slice(0, 8)
      : [
          { id: "empty-a", label: "Private sheet" },
          { id: "empty-b", label: "Private sheet" },
          { id: "empty-c", label: "Private sheet" },
        ];
  const [active, setActive] = useState(0);
  const empty = props.stills.length === 0;

  return (
    <div className="flex h-[26rem] gap-2" role="list">
      {items.map((item, index) => {
        const expanded = index === active;
        return (
          <button
            key={item.id}
            type="button"
            role="listitem"
            aria-pressed={expanded}
            onClick={() => setActive(index)}
            className={cn(
              "relative overflow-hidden rounded-xl border border-border bg-muted text-left transition-[flex] duration-200 ease-out",
              expanded ? "flex-[3.2]" : "flex-[0.7]",
            )}
          >
            {item.previewUrl ? (
              <StillPreview
                src={item.previewUrl}
                alt={item.label ?? "Private still"}
                className="still-thumb h-full w-full object-cover"
              />
            ) : (
              <PlaceholderThumb
                id={item.id}
                family="scene"
                label={item.label ?? "Still"}
                className="h-full rounded-none aspect-auto"
              />
            )}
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 bg-linear-to-t from-background/90 to-transparent p-3 transition-opacity duration-200 ease-out",
                expanded ? "opacity-100" : "opacity-0",
              )}
            >
              <StatusBadge left="Privacy" right="Private" status="success" />
              <p className="mt-2 truncate text-sm">
                {empty ? "Nothing stored yet" : (item.label ?? "Still")}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
