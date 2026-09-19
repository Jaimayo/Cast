import type { DemoStill } from "@/lib/demo-pack";

/** Champagne 3:4 placeholder. Cast F1 mark geometry only — no face, no figure. */
export function demoPlaceholderSvg(still: Pick<DemoStill, "packName" | "label" | "slot" | "role">): string {
  const title = escapeXml(still.packName);
  const label = escapeXml(still.label);
  const kicker = still.role === "library" ? "Demo still" : still.role === "starter" ? "Starter vibe" : "Reference";
  const slot = String(still.slot).padStart(2, "0");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024" role="img" aria-label="${title} fictional placeholder">
  <rect width="768" height="1024" fill="#07070A"/>
  <rect x="48" y="64" width="672" height="896" rx="28" fill="#0E0E14" stroke="#C4A574" stroke-width="2" stroke-dasharray="10 12"/>
  <rect x="284" y="300" width="200" height="144" rx="16" fill="none" stroke="#C4A574" stroke-width="14"/>
  <rect x="334" y="360" width="100" height="12" rx="6" fill="#C4A574"/>
  <text x="384" y="520" text-anchor="middle" fill="#C4A574" font-family="Georgia, 'Palatino Linotype', serif" font-size="42">${title}</text>
  <text x="384" y="568" text-anchor="middle" fill="#9A958C" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" letter-spacing="3">${escapeXml(kicker.toUpperCase())} · ${slot}</text>
  <text x="384" y="620" text-anchor="middle" fill="#F4F1EA" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22">${label}</text>
  <text x="384" y="890" text-anchor="middle" fill="#9A7C52" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" letter-spacing="2">FICTIONAL · PLACEHOLDER</text>
</svg>
`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Guardrail: placeholders must not draw eyes, a mouth, or a body silhouette. */
export function placeholderHasFaceGeometry(svg: string): boolean {
  return /<circle|<ellipse|silhouette|portrait-face|eye|mouth|nose/i.test(svg);
}
