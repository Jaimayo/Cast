# Build handoff — locked Cast logo

Copy `design/brand/locked/svg/*` into `public/brand/` (same filenames).

## Wire

| Surface | Asset |
| --- | --- |
| Landing header | L1 transparent (`cast-lockup-l1-transparent.svg`) |
| Invite + age headers | L1 transparent |
| Studio sidebar | L1 transparent |
| Narrow / mobile chrome | W1 transparent (`cast-wordmark-w1-transparent.svg`) |
| Editorial frames / empty composer | F1 (`cast-mark-f1.svg`) |
| Favicon | `cast-favicon.svg` (+ 16/32 PNG, `favicon.ico`) |

Chrome should crop the 280×40 lockup to the left content (`object-left object-cover` on a ~147×40 box) so the empty canvas does not inflate the hit area.

Do not invent new marks. Age copy stays exact: **I confirm I am 18+.**
