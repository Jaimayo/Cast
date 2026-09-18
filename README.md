# Cast

Private, invite-gated adult NSFW **stills** studio. Consumers generate for themselves using a Higgsfield-like composer (chips → hidden prompt), not a raw prompt box.

This repository is the **Stage 1 scaffold**. Product/architecture locks in the Stage 1 handoff win over older PRD text where they conflict (notably: Character Pack training via RunPod **is** in scope).

## Stage 1 locks (do not reopen in this PR)

- Fictional characters only — no real-person face upload / deepfake NSFW
- Age self-attest stored as `users.age_attested_at`; no studio until set
- Stills first; ~5s clip is Phase 1.5 — UI shows **Animate later**, generation is not implemented
- Character Pack (Soul ID): generate-then-lock **or** library-train from **in-app** stills; min 12 / target ~20 refs
- Composer: Character required + Pose required for Generate; Outfit/Scene/Lighting/Body optional. **No camera. No Advanced panel.**
- Path 1 face/body vibes = `/api/generate-starters` → `training_set_assets` (not Composer templates)
- Providers: Venice = `generateStill` only; RunPod+Comfy = `trainPack` (+ gen fallback). Sister-company adapter slot is reserved and unwired as a default. Venice has no Soul-ID/train API.
- Legal boundary: gated access; do not build real-likeness NSFW paths

## Stack

| Piece | Choice |
| --- | --- |
| App | Next.js App Router + TypeScript (strict) |
| DB | Postgres + Drizzle ORM |
| Jobs | Redis + BullMQ |
| Storage | S3-compatible (R2) with local `.data/storage` fallback |
| Auth | Invite code + password; signed session cookie; `ageAttestedAt` |

## Folder map → locks

| Path | Stage 1 role |
| --- | --- |
| `app/page.tsx` | Non-explicit landing · CTA “Enter with invite” |
| `app/invite`, `app/age` | Invite redeem / sign-in; age+policy (18+ copy locked) |
| `app/app/characters*` | Roster, New wizard (Starters \| From library), pack detail |
| `app/app/create` | Composer chip shell |
| `app/app/library` | Own stills only |
| `middleware.ts` | Invite session **and** `ageAttestedAt` (cookie `age` flag) before `/app/*` |
| `app/api/*` | Vertical-slice API routes (auth, packs, composer, starters, jobs) |
| `db/schema.ts`, `db/migrations` | User, InviteCode, CharacterPack, TrainingSetAsset, GenerationJob, Recipe, media pointers |
| `lib/prompt-compiler.ts` | Chips → hidden prompt (unit tested) |
| `lib/chips.ts` | Composer families only |
| `lib/starters.ts` | Face/body vibe catalog (separate from composer) |
| `server/providers/venice.ts` | `generateStill` HTTP client against native `/image/generate` |
| `server/providers/runpod.ts` | `trainPack` enqueue + generateStill fallback |
| `server/providers/sister.ts` | Future sister private-AI company adapter slot |
| `server/providers/registry.ts` | Provider registry + stub mode |
| `server/providers/comfy/train-pack-workflow.json` | Comfy placeholder |
| `server/storage.ts` | R2/S3 (or local) object storage |
| `workers/` | `generateStill` and `trainPack` BullMQ workers |
| `scripts/create-invite.ts` | CLI invite mint (no UI required) |
| `scripts/seed-demo-pack.ts` | Stub-only Locked + Draft packs for product review |
| `components/chip-thumb-grid.tsx` | Pose/Outfit/Scene/Lighting/Body thumbnail pickers |

## Local setup

Requires Node 20+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
cp .env.example .env.local
cp .env.example .env
```

Edit `.env.local` / `.env`:

- Set a long `SESSION_SECRET`
- Put your email in `ADMIN_EMAILS` so the first redeemed account can open `/admin/invites`
- Leave `PROVIDER_MODE=stub` until Venice/RunPod keys exist
- Never commit real keys

Start Postgres and Redis:

```bash
docker compose up -d
pnpm db:migrate
pnpm invite:create -- --note=bootstrap
```

Run the web app and the worker in two terminals:

```bash
pnpm dev
pnpm worker
```

Open http://localhost:3000 — landing is non-explicit. Path: `/` → `/invite` → `/age` → `/app/characters`.

## Product review path

Jai (and anyone reviewing the product, not the code) should click this path with **stub providers**. No Venice/RunPod keys. No camera, Advanced, raw prompt, or real-person upload.

### Run locally with stub providers

```bash
pnpm install
cp .env.example .env.local
cp .env.example .env
```

In both env files:

- `PROVIDER_MODE=stub`
- a long `SESSION_SECRET`
- your email in `ADMIN_EMAILS` (optional, for `/admin/invites`)

```bash
docker compose up -d
pnpm db:migrate
pnpm invite:create -- --note=review
pnpm dev
```

Worker is optional for UI review. Stub train/generate stills finish faster with `pnpm worker` running in a second terminal.

### Exact clicks

1. **Landing** `/` — non-explicit brand. Click **Enter with invite**.
2. **Invite** `/invite` — paste the code printed by `pnpm invite:create`, email, password (≥10 chars). Continue.
3. **Age** `/age` — check **I confirm I am 18+.** then the fictional-subjects box. **Enter studio** stays disabled until both are checked.
4. **Characters** `/app/characters` — empty roster. Either:
   - Click **Seed demo Locked pack** (stub banner), or
   - `pnpm demo:pack -- --email=you@example.com` after you have an account.
   This creates **Mara (demo)** (Locked Soul ID, 12 placeholder refs) and **Iris (draft)** (not locked).
5. Open **Create** `/app/create` **before** seeding to see **Lock a character to create** (center empty state, Generate disabled, **Go to Characters**). After seeding, Create auto-selects Mara.
6. **Composer** — Character pack thumbs on top (not a `<select>`). Pose / Outfit / Scene / Lighting / Body are thumbnail grids. Header shows **Privacy: Private** and **Credits — later**. **Animate later** is disabled with a **Phase 1.5** badge and helper copy.
7. Click **Iris (draft)** in the character strip to see the empty state again, with secondary **Lock Soul ID first** → pack detail.
8. **Pack wizard** `/app/characters/new` — name + non-removable **Fictional only**. Starters tab uses vibe thumbs (not Composer templates). **Train & lock Soul ID** stays disabled under 12 refs.

Generate is enabled only when a **Locked** pack is selected **and** a Pose thumb is selected.

### Commands

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Next.js app |
| `pnpm worker` | BullMQ workers (`generateStill`, `trainPack`) |
| `pnpm db:migrate` | Apply Drizzle SQL migrations |
| `pnpm invite:create` | Mint an invite code |
| `pnpm demo:pack` | Stub-only: seed Locked + Draft demo packs for a user email |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Unit tests |
| `pnpm build` | Production Next.js build |
| `pnpm check` | typecheck + test + build |

`invite:create` flags: `--note=beta --max=5`.

## Provider wiring

`PROVIDER_MODE=stub` writes a tiny placeholder still and marks train jobs succeeded. Use this for local UI/API flow without vendor keys.

`PROVIDER_MODE=live`:

- `GENERATE_STILL_PROVIDER=venice` calls `POST {VENICE_API_BASE_URL}/image/generate` with `Authorization: Bearer $VENICE_API_KEY`. `safe_mode` comes from `VENICE_SAFE_MODE` (default `false` for this gated adult product). Prompt bodies are not written to application logs.
- If Venice is unset/fails, the worker may fall back to the RunPod generate adapter when `RUNPOD_GENERATE_ENDPOINT_ID` is set.
- `TRAIN_PACK_PROVIDER=runpod` posts to `POST {RUNPOD_API_BASE_URL}/{RUNPOD_TRAIN_ENDPOINT_ID}/run` with reference object keys and the Comfy placeholder. Venice **cannot** be selected for trainPack.
- `sister` adapters implement the same interfaces and are selected only when `GENERATE_STILL_PROVIDER` / `TRAIN_PACK_PROVIDER` is `sister`.

Object storage: set `S3_ENDPOINT`, `S3_BUCKET`, and keys for R2. If those are empty, stills/refs go to `.data/storage/` (gitignored).

## What Stage 1 intentionally excludes

- Real-person likeness, face upload, celebrity/public-figure flows
- Camera controls and Advanced composer
- Full video / clip generation (button only)
- Public gallery, social, marketplace, credits/billing
- Production secrets, live provider keys in git
- Policy classifiers, C2PA, age-vendor integration, encrypted vault

## Build TODOs

- Poll RunPod job status and persist LoRA/adapter artifacts
- Presigned R2 GET for studio previews (no public URLs)
- Replace self-attest with a highly effective age-assurance vendor where legally required
- Output/input policy gateway and prompt log denylist audits
- Credit ledger / adult-approved payments
- Sister-company adapter implementation once that API exists

## License

Private. Not licensed for public use.
