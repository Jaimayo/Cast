import { EnterInviteButton, GateHeader, GateTrustLine } from "@/components/gate-header";
import { Badge } from "@/components/ui/badge";
import { VoidAtmosphere } from "@/components/void-atmosphere";

export function LandingHero() {
  return (
    <VoidAtmosphere>
      <GateHeader />
      <main className="mx-auto flex min-h-[calc(100svh-88px)] w-full max-w-3xl flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="font-heading text-6xl tracking-tight text-foreground sm:text-7xl">Cast</p>
        <h1 className="mt-6 max-w-[18ch] font-heading text-3xl leading-tight text-foreground sm:text-4xl">
          Private fictional studio for adults.
        </h1>
        <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-muted-foreground">
          Direct stills with chips — not prompts. Invite-only. No public gallery.
        </p>
        <div className="mt-10">
          <EnterInviteButton />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="outline" className="rounded-full border-border px-3 py-1 font-normal text-muted-foreground">
            Invite-only
          </Badge>
          <Badge variant="outline" className="rounded-full border-border px-3 py-1 font-normal text-muted-foreground">
            Fictional characters
          </Badge>
          <Badge variant="outline" className="rounded-full border-border px-3 py-1 font-normal text-muted-foreground">
            Private stills
          </Badge>
        </div>
        <div className="mt-4">
          <GateTrustLine />
        </div>
      </main>
    </VoidAtmosphere>
  );
}
