import { LANDING_VISUAL_CAPTION, LANDING_VISUAL_NAMES } from "@/lib/landing-copy";

/**
 * Champagne-on-void hero fill. Painted as one SVG so the right column cannot
 * collapse to empty black if card CSS is dropped or a grid item has no height.
 */
export function LandingHeroVisual() {
  return (
    <div className="landing-visual">
      <svg
        className="landing-visual-svg"
        viewBox="0 0 540 640"
        role="img"
        aria-label={`${LANDING_VISUAL_NAMES} ${LANDING_VISUAL_CAPTION}`}
      >
        <defs>
          <radialGradient id="castLandingGlow" cx="50%" cy="46%" r="58%">
            <stop offset="0%" stopColor="#C4A574" stopOpacity="0.3" />
            <stop offset="38%" stopColor="#3A3358" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#07070A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="castLandingFront" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#3A3358" />
            <stop offset="46%" stopColor="#1C182C" />
            <stop offset="100%" stopColor="#0E0E14" />
          </linearGradient>
        </defs>

        <ellipse cx="270" cy="318" rx="250" ry="260" fill="url(#castLandingGlow)" />

        <g transform="translate(302 304) rotate(9)">
          <rect
            x="-128"
            y="-188"
            width="256"
            height="376"
            rx="28"
            fill="#0E0E14"
            stroke="#C4A574"
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />
        </g>
        <g transform="translate(286 310) rotate(5)">
          <rect
            x="-128"
            y="-188"
            width="256"
            height="376"
            rx="28"
            fill="#0E0E14"
            stroke="#C4A574"
            strokeOpacity="0.4"
            strokeWidth="1.5"
          />
        </g>

        <g transform="translate(252 322) rotate(-0.5)">
          <rect
            x="-132"
            y="-196"
            width="264"
            height="392"
            rx="28"
            fill="url(#castLandingFront)"
            stroke="#C4A574"
            strokeOpacity="0.58"
            strokeWidth="1.7"
          />
          <rect
            x="-40"
            y="-42"
            width="80"
            height="56"
            rx="12"
            fill="none"
            stroke="#C4A574"
            strokeWidth="2.3"
          />
          <rect x="-18" y="-4" width="36" height="5.5" rx="2.75" fill="#C4A574" />
          <text
            x="0"
            y="148"
            textAnchor="middle"
            fill="#C4A574"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontSize="13"
            letterSpacing="4.2"
          >
            {LANDING_VISUAL_NAMES.toUpperCase()}
          </text>
          <text
            x="0"
            y="172"
            textAnchor="middle"
            fill="#9A958C"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontSize="13"
          >
            {LANDING_VISUAL_CAPTION}
          </text>
        </g>

        <Chip x={86} y={318} label="Pose" />
        <Chip x={438} y={214} label="Scene" />
        <Chip x={452} y={392} label="Lighting" />
      </svg>
    </div>
  );
}

function Chip(props: { x: number; y: number; label: string }) {
  const width = Math.max(72, props.label.length * 8.2 + 28);
  const height = 32;
  return (
    <g transform={`translate(${props.x} ${props.y})`}>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={height / 2}
        fill="#07070A"
        stroke="#C4A574"
        strokeOpacity="0.7"
        strokeWidth="1.4"
      />
      <text
        x="0"
        y="5"
        textAnchor="middle"
        fill="#C4A574"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="13"
      >
        {props.label}
      </text>
    </g>
  );
}
