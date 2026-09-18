"use client";

import { useState } from "react";
import type { ChipFamily } from "@/lib/chips";
import { chipSwatch } from "@/lib/chip-visuals";
import { ChipThumbGrid, type ThumbChip } from "@/components/chip-thumb-grid";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function ChipPicker(props: {
  family: ChipFamily;
  title: string;
  chips: ThumbChip[];
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = props.chips.find((chip) => chip.id === props.value);
  const swatch = chipSwatch(props.family, props.value || "unset");

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left md:hidden"
        onClick={() => setOpen(true)}
      >
        <span
          className={cn(
            "size-11 shrink-0 rounded-md ring-1 ring-border",
            props.value !== "" && "ring-2 ring-primary",
          )}
          style={{ background: `linear-gradient(152deg, ${swatch.from}, ${swatch.to})` }}
        />
        <span className="min-w-0">
          <span className="block text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            {props.title}
            {props.required ? " *" : ""}
          </span>
          <span className="block truncate text-sm text-foreground">{selected?.label ?? "Unset"}</span>
        </span>
      </button>

      <div className="hidden md:block">
        <ChipThumbGrid {...props} compact />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[80svh] overflow-y-auto bg-card">
          <SheetHeader>
            <SheetTitle>{props.title}</SheetTitle>
            <SheetDescription>Thumbnail grid — chips compile to a hidden prompt.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <ChipThumbGrid
              {...props}
              onChange={(id) => {
                props.onChange(id);
                setOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
