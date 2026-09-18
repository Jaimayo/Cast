"use client";

import { StatusBadge } from "@/components/cast/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function PrivacyBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <StatusBadge left="Privacy" right="Private" status="success" />
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6} className="max-w-xs text-left">
        Generations stay private to your account. No public gallery.
      </TooltipContent>
    </Tooltip>
  );
}
