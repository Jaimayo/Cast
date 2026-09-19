# Cast Stage 1 — Logo LOCKED

**Status:** LOCKED by Jai — **L1 simple frame lockup**. Ship into Stage 1 UI.  
**Optical polish only — no further direction exploration.**

## Tokens

| Token | Hex |
|-------|-----|
| Void background | `#07070A` |
| Champagne | `#C4A574` |
| Warm off-white | `#F4F1EA` |
| Muted | `#9A958C` |

Dark-only Stage 1. No light invert. No bodies/faces.

## Primary assets (use these paths)

All under `/workspace/cast-handoff/design/brand/locked/`

| Role | SVG | PNG (QA) |
|------|-----|----------|
| **L1 lockup** (primary) | `svg/cast-lockup-l1.svg` · transparent: `svg/cast-lockup-l1-transparent.svg` | `exports/cast-lockup-l1.png` |
| **F1 mark** | `svg/cast-mark-f1.svg` | `exports/cast-mark-f1.png` |
| **Favicon / PWA** | `svg/cast-favicon.svg` · `cast-favicon-16.svg` · `cast-favicon-32.svg` | matching `exports/` |
| **W1 wordmark alone** | `svg/cast-wordmark-w1.svg` · transparent: `cast-wordmark-w1-transparent.svg` | `exports/cast-wordmark-w1.png` |
| Landing mock (reference) | `svg/MOCK-landing-header.svg` | `exports/MOCK-landing-header.png` |

Legacy aliases (`L1-lockup.svg`, `ICON-favicon.svg`, `W1-wordmark.svg`, etc.) remain in `svg/` for compatibility.

## Spec

- **Mark:** Rounded rectangle frame + centered champagne bar (Hero Frame)
- **Wordmark:** Geometric sans `CAST`, weight 500, tracking `0.18em`, color `#F4F1EA`
- **Lockup:** Mark left of wordmark; mark height ≈ 0.72 of cap height; clear space ≥ 0.5× mark height

## Usage (Build)

| Surface | Asset |
|---------|--------|
| Landing `/`, invite `/invite`, age `/age` | **L1** lockup |
| App chrome header (comfortable width) | **L1** compact (transparent SVG) |
| Narrow chrome | **W1** wordmark alone |
| Favicon, apple-touch, PWA | **cast-favicon** (+ 16/32) |
| Loading / empty mark-only | **F1** mark |

## Suggested repo paths

```
public/brand/cast-lockup-l1.svg
public/brand/cast-lockup-l1-transparent.svg
public/brand/cast-wordmark-w1-transparent.svg
public/brand/cast-mark-f1.svg
public/favicon.svg          ← from cast-favicon.svg
public/favicon-16.png / favicon-32.png
```

Wire header to match `MOCK-landing-header` proportions.
