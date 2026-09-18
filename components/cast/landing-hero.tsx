import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoidAtmosphere } from "@/components/cast/void-atmosphere";
import { Wordmark } from "@/components/cast/wordmark";

export function LandingHero() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <VoidAtmosphere />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-12 text-center">
        <Wordmark size="lg" />
        <p className="mt-8 max-w-[22ch] text-pretty text-xl font-normal tracking-tight text-foreground/90 md:text-2xl">
          Direct fictional stills — privately.
        </p>
        <div className="mt-10">
          <Button asChild size="xl">
            <a href="/invite">Enter with invite</a>
          </Button>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-muted-foreground">
          <Badge variant="outline" className="border-border/80 font-normal text-muted-foreground">
            Invite-only
          </Badge>
          <Badge variant="outline" className="border-border/80 font-normal text-muted-foreground">
            Fictional characters
          </Badge>
          <Badge variant="outline" className="border-border/80 font-normal text-muted-foreground">
            Private stills
          </Badge>
        </div>
      </div>
    </div>
  );
}
