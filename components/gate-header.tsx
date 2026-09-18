import { MetallicButton } from "@/components/metallic-button";
import { StatusBadge } from "@/components/ui/status-badge";

export function GateHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <a href="/" className="font-heading text-2xl tracking-tight text-foreground">
            Cast
          </a>
          <StatusBadge status="outline" className="hidden sm:inline-flex" leftLabel="Invite" rightLabel="only" />
        </div>
        <EnterInviteButton />
      </div>
    </header>
  );
}

export function GateTrustLine() {
  return (
    <p className="text-muted-foreground text-sm tracking-wide">
      Invite-only · Fictional characters · Private stills
    </p>
  );
}

export function EnterInviteButton(props: { className?: string }) {
  return (
    <MetallicButton asChild className={props.className}>
      <a href="/invite">Enter with invite</a>
    </MetallicButton>
  );
}
