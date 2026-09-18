import { cn } from "@/lib/utils";
import { chipThumbSpec, type ChipThumbSpec } from "@/lib/chip-visuals";

function Mark({ spec }: { spec: ChipThumbSpec }) {
  const stroke = spec.mark === "highkey" ? "#0a0a0c" : "#c4a574";
  const faint = spec.mark === "highkey" ? "rgba(10,10,12,0.35)" : "rgba(196,165,116,0.35)";
  const initial = spec.label.slice(0, 1).toUpperCase();

  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
      {spec.mark === "stand" ? (
        <>
          <circle cx="50" cy="22" r="6" fill="none" stroke={stroke} strokeWidth="1.6" />
          <path d="M50 28v28M50 56l-14 22M50 56l14 22M36 42h28" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : null}
      {spec.mark === "sit" ? (
        <>
          <circle cx="42" cy="26" r="6" fill="none" stroke={stroke} strokeWidth="1.6" />
          <path d="M42 32v18h22M42 50l-8 24M64 50v24M32 50h40" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : null}
      {spec.mark === "recline" ? (
        <>
          <circle cx="26" cy="48" r="6" fill="none" stroke={stroke} strokeWidth="1.6" />
          <path d="M32 50h36l12 14M32 50l8 18M68 50l-6 18" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : null}
      {spec.mark === "three-quarter" ? (
        <>
          <circle cx="58" cy="22" r="6" fill="none" stroke={stroke} strokeWidth="1.6" />
          <path d="M56 28l-6 26M50 54l-16 24M50 54l10 24M50 40l18 6" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : null}
      {spec.mark === "over-shoulder" ? (
        <>
          <circle cx="62" cy="24" r="6" fill="none" stroke={stroke} strokeWidth="1.6" />
          <path d="M58 30c-10 8-14 18-8 28M50 58l-12 22M50 58l16 22M42 42h22" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : null}
      {spec.mark === "contrapposto" ? (
        <>
          <circle cx="50" cy="20" r="6" fill="none" stroke={stroke} strokeWidth="1.6" />
          <path d="M50 26c-4 12 6 16 2 30M52 56l-18 24M52 56l8 24M40 42h26" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : null}
      {spec.mark === "tailored" ? (
        <path d="M32 22h36l6 56H26z M50 22v56 M38 22l12 18L62 22" fill="none" stroke={stroke} strokeWidth="1.5" />
      ) : null}
      {spec.mark === "robe" ? (
        <path d="M30 20c8 8 32 8 40 0v60c-14-10-26-10-40 0z" fill="none" stroke={stroke} strokeWidth="1.5" />
      ) : null}
      {spec.mark === "knit" ? (
        <>
          <rect x="34" y="18" width="32" height="28" rx="6" fill="none" stroke={stroke} strokeWidth="1.5" />
          <rect x="30" y="50" width="40" height="32" rx="6" fill="none" stroke={stroke} strokeWidth="1.5" />
        </>
      ) : null}
      {spec.mark === "evening" ? (
        <path d="M42 16h16l6 22H36z M28 38h44L62 84H38z" fill="none" stroke={stroke} strokeWidth="1.5" />
      ) : null}
      {spec.mark === "lattice" ? (
        <>
          <path d="M28 28h44v44H28z" fill="none" stroke={stroke} strokeWidth="1.2" />
          <path d="M28 42h44M28 56h44M42 28v44M56 28v44" fill="none" stroke={faint} strokeWidth="1" />
        </>
      ) : null}
      {spec.mark === "drape" ? (
        <path d="M22 22c18 28 38 28 56 0M22 78c18-28 38-28 56 0" fill="none" stroke={stroke} strokeWidth="1.5" />
      ) : null}
      {spec.mark === "cyc" ? (
        <path d="M18 78c10-40 54-40 64 0" fill="none" stroke={stroke} strokeWidth="1.4" />
      ) : null}
      {spec.mark === "loft" ? (
        <>
          <rect x="22" y="22" width="56" height="40" fill="none" stroke={stroke} strokeWidth="1.3" />
          <path d="M50 22v40M22 42h56" stroke={faint} strokeWidth="1" />
        </>
      ) : null}
      {spec.mark === "suite" ? (
        <>
          <circle cx="32" cy="38" r="8" fill={faint} />
          <circle cx="70" cy="52" r="5" fill={faint} />
          <path d="M20 78h60" stroke={stroke} strokeWidth="1.3" />
        </>
      ) : null}
      {spec.mark === "marble" ? (
        <path d="M18 30c20 8 18 20 0 28M40 22c24 16 10 40-8 50M70 28c-18 18-6 36 8 48" fill="none" stroke={stroke} strokeWidth="1.2" />
      ) : null}
      {spec.mark === "night" ? (
        <>
          <circle cx="30" cy="32" r="3" fill={stroke} />
          <circle cx="68" cy="44" r="2" fill={stroke} />
          <circle cx="48" cy="60" r="1.5" fill={stroke} />
        </>
      ) : null}
      {spec.mark === "dusk" ? (
        <path d="M12 58c20-18 56-18 76 0M12 78h76" fill="none" stroke={stroke} strokeWidth="1.3" />
      ) : null}
      {spec.mark === "softbox" ? <circle cx="50" cy="38" r="22" fill="none" stroke={stroke} strokeWidth="1.4" opacity="0.85" /> : null}
      {spec.mark === "rembrandt" ? <path d="M50 22l22 38H28z" fill={faint} stroke={stroke} strokeWidth="1.2" /> : null}
      {spec.mark === "window" ? (
        <>
          <rect x="22" y="20" width="36" height="52" fill="none" stroke={stroke} strokeWidth="1.3" />
          <path d="M40 20v52M22 46h36" stroke={faint} strokeWidth="1" />
        </>
      ) : null}
      {spec.mark === "neon" ? (
        <>
          <path d="M24 70c8-28 20-40 28-40" fill="none" stroke="#8aa4b8" strokeWidth="2" />
          <path d="M48 30c8 0 20 12 28 40" fill="none" stroke="#c4a574" strokeWidth="2" />
        </>
      ) : null}
      {spec.mark === "candle" ? (
        <>
          <path d="M46 78V48h8v30z" fill="none" stroke={stroke} strokeWidth="1.3" />
          <ellipse cx="50" cy="40" rx="6" ry="10" fill={faint} stroke={stroke} strokeWidth="1" />
        </>
      ) : null}
      {spec.mark === "highkey" ? <rect x="22" y="22" width="56" height="56" fill="none" stroke={stroke} strokeWidth="1.2" /> : null}
      {spec.mark === "athletic" ? <path d="M32 22h36L58 78H42z" fill="none" stroke={stroke} strokeWidth="1.5" /> : null}
      {spec.mark === "hourglass" ? <path d="M34 20h32L50 50l16 30H34L50 50z" fill="none" stroke={stroke} strokeWidth="1.5" /> : null}
      {spec.mark === "lean" ? <path d="M44 18h12L52 82H48z" fill="none" stroke={stroke} strokeWidth="1.5" /> : null}
      {spec.mark === "solid" ? <rect x="30" y="22" width="40" height="56" rx="6" fill="none" stroke={stroke} strokeWidth="1.5" /> : null}
      {spec.mark === "tall" ? <rect x="40" y="12" width="20" height="76" rx="4" fill="none" stroke={stroke} strokeWidth="1.5" /> : null}
      {spec.mark === "swatch" ? <circle cx="50" cy="50" r="16" fill="none" stroke={stroke} strokeWidth="1.2" opacity="0.7" /> : null}
      {spec.mark === "monogram" ? (
        <text x="50" y="58" textAnchor="middle" fill={stroke} fontSize="28" fontFamily="Georgia, serif">
          {initial}
        </text>
      ) : null}
    </svg>
  );
}

export function PlaceholderThumb(props: {
  id: string;
  family?: ChipThumbSpec["family"];
  label?: string;
  className?: string;
}) {
  const spec = chipThumbSpec(props.id, props.family, props.label);
  return (
    <div
      className={cn("relative aspect-square overflow-hidden rounded-[var(--radius-chip)] bg-muted", props.className)}
      style={{ backgroundImage: spec.field }}
      aria-hidden
    >
      <Mark spec={spec} />
    </div>
  );
}
