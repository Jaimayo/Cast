import { cn } from "@/lib/utils";

/** Tracked CAST paths from public/brand/cast-wordmark-w1-transparent.svg */
const CAST_PATH =
  "M50.95 29.7Q48.49 29.7 46.57 28.54Q44.64 27.37 43.54 25.2Q42.43 23.03 42.43 20.01Q42.43 16.97 43.55 14.79Q44.66 12.62 46.58 11.45Q48.5 10.28 50.95 10.28Q52.95 10.28 54.6 11.04Q56.25 11.79 57.34 13.22Q58.43 14.65 58.75 16.65H55.84Q55.49 14.85 54.12 13.89Q52.76 12.92 50.98 12.92Q49.35 12.92 48.07 13.74Q46.79 14.56 46.05 16.14Q45.3 17.72 45.3 20.01Q45.3 22.3 46.05 23.88Q46.79 25.45 48.07 26.26Q49.35 27.06 50.98 27.06Q52.76 27.06 54.12 26.09Q55.49 25.12 55.84 23.32H58.76Q58.47 25.2 57.41 26.63Q56.35 28.07 54.69 28.89Q53.04 29.7 50.95 29.7Z M69.56 29.45 76.28 10.53H79.84L86.69 29.45H83.56L81.82 24.46H74.38L72.69 29.45ZM75.21 22.05H80.97L79.88 18.93Q79.5 17.8 79.05 16.31Q78.61 14.81 78.05 12.81Q77.49 14.84 77.05 16.34Q76.61 17.85 76.26 18.93Z M104.62 29.77Q101.44 29.77 99.55 28.28Q97.65 26.78 97.53 24.2H100.43Q100.56 25.74 101.77 26.49Q102.97 27.23 104.61 27.23Q106.41 27.23 107.6 26.39Q108.78 25.55 108.78 24.18Q108.78 22.95 107.74 22.35Q106.71 21.74 105.18 21.34L102.97 20.73Q100.65 20.11 99.35 18.89Q98.05 17.67 98.05 15.73Q98.05 14.09 98.93 12.86Q99.81 11.64 101.33 10.96Q102.85 10.28 104.75 10.28Q106.69 10.28 108.17 10.96Q109.65 11.64 110.5 12.83Q111.34 14.01 111.38 15.51H108.56Q108.42 14.22 107.36 13.51Q106.3 12.79 104.69 12.79Q102.97 12.79 101.96 13.58Q100.94 14.36 100.94 15.56Q100.94 16.46 101.49 17.02Q102.03 17.57 102.83 17.89Q103.62 18.22 104.35 18.41L106.19 18.89Q107.09 19.12 108.05 19.5Q109 19.89 109.82 20.51Q110.63 21.12 111.13 22.03Q111.63 22.94 111.63 24.22Q111.63 25.82 110.81 27.08Q109.98 28.33 108.41 29.05Q106.85 29.77 104.62 29.77Z M122.96 13.02V10.53H137.65V13.02H131.77V29.45H128.86V13.02Z";

const W1_PATH =
  "M9.95 19.76Q7.49 19.76 5.57 18.59Q3.64 17.42 2.54 15.25Q1.43 13.08 1.43 10.06Q1.43 7.02 2.55 4.85Q3.66 2.67 5.58 1.5Q7.5 0.33 9.95 0.33Q11.95 0.33 13.6 1.09Q15.25 1.84 16.34 3.27Q17.43 4.7 17.75 6.71H14.84Q14.49 4.9 13.12 3.94Q11.76 2.97 9.98 2.97Q8.35 2.97 7.07 3.79Q5.79 4.61 5.05 6.19Q4.3 7.77 4.3 10.06Q4.3 12.35 5.05 13.93Q5.79 15.5 7.07 16.31Q8.35 17.12 9.98 17.12Q11.76 17.12 13.12 16.14Q14.49 15.17 14.84 13.37H17.76Q17.47 15.25 16.41 16.68Q15.35 18.12 13.69 18.94Q12.04 19.76 9.95 19.76Z M28.56 19.5 35.28 0.59H38.84L45.69 19.5H42.56L40.82 14.51H33.38L31.69 19.5ZM34.21 12.1H39.97L38.88 8.98Q38.5 7.85 38.05 6.36Q37.61 4.86 37.05 2.86Q36.49 4.89 36.05 6.39Q35.61 7.9 35.26 8.98Z M63.62 19.82Q60.44 19.82 58.55 18.33Q56.65 16.84 56.53 14.25H59.43Q59.56 15.79 60.77 16.54Q61.97 17.28 63.61 17.28Q65.41 17.28 66.6 16.44Q67.78 15.6 67.78 14.23Q67.78 13 66.74 12.4Q65.71 11.8 64.18 11.39L61.97 10.78Q59.65 10.16 58.35 8.94Q57.05 7.72 57.05 5.78Q57.05 4.14 57.93 2.92Q58.81 1.69 60.33 1.01Q61.85 0.33 63.75 0.33Q65.69 0.33 67.17 1.01Q68.65 1.69 69.5 2.88Q70.34 4.06 70.38 5.56H67.56Q67.42 4.27 66.36 3.56Q65.3 2.85 63.69 2.85Q61.97 2.85 60.96 3.63Q59.94 4.41 59.94 5.61Q59.94 6.51 60.49 7.07Q61.03 7.62 61.83 7.94Q62.62 8.27 63.35 8.46L65.19 8.94Q66.09 9.17 67.05 9.56Q68 9.94 68.82 10.56Q69.63 11.17 70.13 12.08Q70.63 12.99 70.63 14.27Q70.63 15.87 69.81 17.13Q68.98 18.38 67.41 19.1Q65.85 19.82 63.62 19.82Z M81.96 3.07V0.59H96.65V3.07H90.77V19.5H87.86V3.07Z";

type LogoSize = "sm" | "md" | "lg";

const LOCKUP: Record<LogoSize, string> = {
  sm: "h-7 w-[103px]",
  md: "h-8 w-[118px]",
  lg: "h-12 w-[176px]",
};

const MARK: Record<LogoSize, string> = {
  sm: "h-7 w-[21px]",
  md: "h-8 w-6",
  lg: "h-12 w-9",
};

const W1: Record<LogoSize, string> = {
  sm: "h-[18px] w-[67px]",
  md: "h-5 w-[74px]",
  lg: "h-8 w-[118px]",
};

/** F1 — simple rounded still-frame with center bar. */
export function CastMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 36 48" className={cn("text-primary", props.className)} aria-hidden>
      <rect
        x="1.2"
        y="1.2"
        width="33.6"
        height="45.6"
        rx="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <line
        x1="8.5"
        y1="24"
        x2="27.5"
        y2="24"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** W1 — tracked CAST with hairline underline. */
export function CastWordmark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 97.79 26.4" className={cn("text-primary", props.className)} aria-hidden>
      <path d={W1_PATH} fill="currentColor" />
      <line x1="0" y1="24.9" x2="97.79" y2="24.9" stroke="currentColor" strokeWidth="1.15" />
    </svg>
  );
}

/** L1 lockup artwork (optical mid-line). Tight crop of the 280×40 production SVG. */
function CastLockupSvg(props: { className?: string }) {
  return (
    <svg viewBox="0 0 147 40" className={cn("text-primary", props.className)} aria-hidden>
      <rect
        x="9"
        y="7"
        width="19"
        height="26"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="13.2"
        y1="20"
        x2="23.8"
        y2="20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d={CAST_PATH} fill="currentColor" />
    </svg>
  );
}

/** L1 — F1 mark + tracked CAST on one mid-line. Narrow chrome can fall back to F1. */
export function Wordmark(props: {
  href?: string;
  className?: string;
  size?: LogoSize;
  collapse?: "mark" | "wordmark" | "none";
}) {
  const size = props.size ?? "md";
  const collapse = props.collapse ?? "mark";
  const content = (
    <span className={cn("inline-flex items-center text-primary", props.className)}>
      <CastLockupSvg
        className={cn(
          LOCKUP[size],
          collapse === "mark" && "max-[22rem]:hidden",
          collapse === "wordmark" && "max-[22rem]:hidden",
        )}
      />
      <CastMark
        className={cn(MARK[size], collapse === "mark" ? "hidden max-[22rem]:block" : "hidden")}
      />
      <CastWordmark
        className={cn(W1[size], collapse === "wordmark" ? "hidden max-[22rem]:block" : "hidden")}
      />
    </span>
  );

  if (!props.href) {
    return (
      <span className="inline-flex" role="img" aria-label="Cast">
        {content}
      </span>
    );
  }

  return (
    <a href={props.href} className="inline-flex" aria-label="Cast">
      {content}
    </a>
  );
}
