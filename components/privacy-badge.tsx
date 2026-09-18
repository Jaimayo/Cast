"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/ui/status-badge";

export function PrivacyBadge() {
  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex cursor-default rounded-full">
        <StatusBadge status="outline" leftLabel="Privacy" rightLabel="Private" />
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
        <StatusBadge status="muted" leftLabel="Credits" rightLabel="later" />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-card text-card-foreground ring-1 ring-border">
        Billing comes later. This is not a balance.
      </TooltipContent>
    </Tooltip>
  );
}
