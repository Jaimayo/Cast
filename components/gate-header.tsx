import { Button } from "@/components/ui/button";

export function GateHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6">
      <a href="/" className="font-heading text-2xl tracking-tight text-foreground">
        Cast
      </a>
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
    <Button asChild size="lg" className={`h-11 rounded-full px-6 ${props.className ?? ""}`}>
      <a href="/invite">Enter with invite</a>
    </Button>
  );
}
