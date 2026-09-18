import { LOCK_SOUL_ID_FIRST } from "@/lib/soul";
import { MetallicButton } from "@/components/metallic-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function GenerateButton(props: {
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
  disabledReason?: string;
}) {
  return (
    <MetallicButton
      type="button"
      disabled={props.disabled || props.pending}
      title={props.disabled ? (props.disabledReason ?? LOCK_SOUL_ID_FIRST) : undefined}
      onClick={props.onClick}
    >
      {props.pending ? "Queueing…" : "Generate"}
    </MetallicButton>
  );
}

export function TeaserAnimateLater() {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button type="button" variant="outline" disabled className="h-11 rounded-full px-5">
                Animate later
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="bg-card text-card-foreground ring-1 ring-border">
            Short clips come in Phase 1.5 — stills first.
          </TooltipContent>
        </Tooltip>
        <StatusBadge status="outline" leftLabel="Phase" rightLabel="1.5" />
      </div>
      <p className="text-xs text-muted-foreground">Short clips come in Phase 1.5 — stills first.</p>
    </div>
  );
}
