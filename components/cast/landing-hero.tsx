import { StatusBadge } from "@/components/cast/status-badge";
import { VoidAtmosphere } from "@/components/cast/void-atmosphere";
import { CastMark, Wordmark } from "@/components/cast/wordmark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function EditorialFrame(props: { className?: string }) {
  return (
    <div
      className={cn(
        "cast-surface absolute aspect-[3/4] overflow-hidden rounded-xl border border-border/80 bg-card/80",
        props.className,
      )}
    >
      <div className="cast-vignette absolute inset-0" />
      <CastMark className="absolute top-1/2 left-1/2 h-10 w-[30px] -translate-x-1/2 -translate-y-1/2 opacity-40" />
    </div>
  );
}

export function LandingHero() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <VoidAtmosphere />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Wordmark href="/" size="sm" />
        <StatusBadge left="Access" right="Invite-only" status="warning" />
      </header>
      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 pb-20 pt-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:px-10">
        <div>
          <p className="mb-5 text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Private stills studio
          </p>
          <h1 className="font-heading text-5xl leading-[0.95] tracking-tight text-transparent md:text-7xl bg-linear-to-b from-[#f4f1ea] to-[#c4a574] bg-clip-text">
            Direct fictional stills — privately.
          </h1>
          <p className="mt-6 max-w-[36ch] text-base leading-relaxed text-muted-foreground">
            Invite-only composition. Chips, not chat. No public gallery.
          </p>
          <div className="mt-9">
            <Button asChild size="xl" variant="metallic">
              <a href="/invite">Enter with invite</a>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            <StatusBadge left="Invite" right="only" status="muted" />
            <StatusBadge left="Characters" right="Fictional" status="warning" />
            <StatusBadge left="Stills" right="Private" status="success" />
          </div>
        </div>
        <div className="relative mx-auto hidden h-[28rem] w-full max-w-md md:block" aria-hidden>
          <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/16 blur-[90px]" />
          <EditorialFrame className="top-2 left-6 w-44 rotate-[-8deg]" />
          <EditorialFrame className="top-16 right-2 w-52 rotate-[5deg] border-primary/35" />
          <EditorialFrame className="bottom-4 left-16 w-40 rotate-[-2deg]" />
        </div>
      </div>
    </div>
  );
}
