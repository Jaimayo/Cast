"use client";

import type { ReactNode } from "react";
import { ChipThumbGrid } from "@/components/cast/chip-thumb-grid";
import { PlaceholderThumb } from "@/components/cast/placeholder-thumb";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-media-query";
import type { ThumbFamily } from "@/lib/chip-visuals";
import { cn } from "@/lib/utils";

type Chip = { id: string; label: string };

export function ChipSelect(props: {
  title: string;
  chips: Chip[];
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
  required?: boolean;
  family: ThumbFamily;
  icon?: ReactNode;
}) {
  const mobile = useIsMobile();
  const selected = props.chips.find((chip) => chip.id === props.value);
  const trigger = (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-auto w-full justify-start gap-3 rounded-xl border border-transparent px-2 py-2 text-left hover:bg-muted",
        selected && "border-primary/40 ring-1 ring-primary/70",
      )}
    >
      <div className="size-11 shrink-0 overflow-hidden rounded-[var(--radius-chip)]">
        {selected ? (
          <PlaceholderThumb id={selected.id} family={props.family} label={selected.label} />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
            {props.icon}
          </div>
        )}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          {props.title}
          {props.required ? " *" : ""}
        </span>
        <span className="block truncate text-sm text-foreground">{selected?.label ?? "Select"}</span>
      </span>
    </Button>
  );

  const grid = (
    <ChipThumbGrid
      family={props.family}
      chips={props.chips}
      value={props.value}
      onChange={props.onChange}
      optional={props.optional}
    />
  );

  if (mobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto bg-card">
          <SheetHeader>
            <SheetTitle>{props.title}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">{grid}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" side="right" className="w-[min(28rem,calc(100vw-2rem))] p-3">
        {grid}
      </PopoverContent>
    </Popover>
  );
}
