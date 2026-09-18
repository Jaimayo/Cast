"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TeaserAnimateLater() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button type="button" variant="outline" size="xl" disabled className="gap-2 rounded-full">
            Animate later
            <Badge variant="outline" className="h-5 border-border font-normal text-muted-foreground">
              Phase 1.5
            </Badge>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>Short clips come in Phase 1.5 — stills first.</TooltipContent>
    </Tooltip>
  );
}
