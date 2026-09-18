import { StatusBadge } from "@/components/ui/status-badge";

export function GateStage(props: {
  kicker: string;
  headline: string;
  subhead: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <div aria-hidden className="cast-dots pointer-events-none absolute inset-0 opacity-80" />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 top-24 size-72 rounded-full bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] blur-3xl"
        />
        <div className="relative">
          <a href="/" className="font-heading text-3xl tracking-tight">
            Cast
          </a>
          <p className="mt-3 text-[11px] tracking-[0.18em] text-primary uppercase">{props.kicker}</p>
        </div>
        <div className="relative max-w-sm">
          <h2 className="font-heading text-4xl leading-tight">{props.headline}</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{props.subhead}</p>
        </div>
        <div className="relative flex flex-wrap gap-2">
          <StatusBadge status="outline" leftLabel="Invite" rightLabel="only" />
          <StatusBadge status="outline" leftLabel="Fictional" rightLabel="characters" />
          <StatusBadge status="outline" leftLabel="Private" rightLabel="stills" />
        </div>
      </aside>
      <div className="relative flex flex-col">
        <header className="flex items-center justify-between px-5 py-5 lg:hidden">
          <a href="/" className="font-heading text-2xl tracking-tight">
            Cast
          </a>
          <StatusBadge status="outline" leftLabel="Invite" rightLabel="only" />
        </header>
        <div className="flex flex-1 items-center justify-center px-5 pb-16 pt-2 lg:px-10 lg:py-12">
          {props.children}
        </div>
      </div>
    </div>
  );
}
