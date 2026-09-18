import { EnterInviteButton, GateHeader } from "@/components/gate-header";
import { EditorialCollage } from "@/components/editorial-collage";
import { StatusBadge } from "@/components/ui/status-badge";
import { VoidAtmosphere } from "@/components/void-atmosphere";

export function LandingHero() {
  return (
    <VoidAtmosphere>
      <GateHeader />
      <main className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-20">
        <div className="max-w-xl">
          <StatusBadge status="outline" leftLabel="Invite only" rightLabel="Fictional characters" />
          <h1 className="mt-6 font-heading text-4xl leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Private fictional studio for adults.
          </h1>
          <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-muted-foreground">
            Direct stills with chips — not prompts. Invite-only. No public gallery.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <EnterInviteButton />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <StatusBadge status="outline" leftLabel="Invite" rightLabel="only" />
            <StatusBadge status="outline" leftLabel="Fictional" rightLabel="characters" />
            <StatusBadge status="outline" leftLabel="Private" rightLabel="stills" />
          </div>
        </div>
        <EditorialCollage />
      </main>
    </VoidAtmosphere>
  );
}
