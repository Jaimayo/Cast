import { LOCK_SOUL_ID_FIRST, packDetailPath } from "@/lib/soul";
import { Button } from "@/components/ui/button";

export function LockSoulIdFirstCta(props: {
  packId?: string | null;
  training?: boolean;
  variant?: "button" | "link";
}) {
  const href = packDetailPath(props.packId);
  const label = LOCK_SOUL_ID_FIRST;
  return (
    <div className="flex flex-col items-start gap-2">
      {props.training ? <p className="text-sm text-success">Training Soul ID…</p> : null}
      {props.variant === "link" ? (
        <a href={href} className="text-sm text-primary underline-offset-4 hover:underline">
          {label}
        </a>
      ) : (
        <Button asChild size="xl" variant="metallic">
          <a href={href}>{label}</a>
        </Button>
      )}
    </div>
  );
}
