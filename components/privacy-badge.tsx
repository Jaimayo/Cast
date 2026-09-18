"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export function PrivacyBadge() {
  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex cursor-default rounded-full">
        <Badge
          variant="outline"
          className="h-7 rounded-full border-border px-3 font-normal text-muted-foreground"
        >
          Privacy: Private
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-card text-card-foreground ring-1 ring-border">
        Generations stay private to your account. No public gallery.
      </TooltipContent>
    </Tooltip>
  );
}

export function CreditsLater() {
  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex cursor-default rounded-full">
        <Badge variant="secondary" className="h-7 rounded-full px-3 font-normal text-muted-foreground">
          Credits — later
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-card text-card-foreground ring-1 ring-border">
        Billing comes later. This is not a balance.
      </TooltipContent>
    </Tooltip>
  );
}
