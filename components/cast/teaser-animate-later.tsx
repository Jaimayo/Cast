"use client";

import { StatusBadge } from "@/components/cast/status-badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TeaserAnimateLater() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button type="button" variant="outline" size="xl" disabled className="gap-2 rounded-full">
            Animate later
            <StatusBadge left="Phase" right="1.5" status="muted" />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>Short clips come in Phase 1.5 — stills first.</TooltipContent>
    </Tooltip>
  );
}
