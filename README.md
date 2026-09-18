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
| `app/api/*` | Vertical-slice API routes (auth, packs, composer, starters, jobs, pack test-grid / retrain) |
| `db/schema.ts`, `db/migrations` | User, InviteCode, CharacterPack, TrainingSetAsset, GenerationJob, Recipe, media pointers |
| `lib/prompt-compiler.ts` | Chips → hidden prompt (unit tested) |
| `lib/chips.ts` | Composer families only |
| `lib/starters.ts` | Face/body vibe catalog (separate from composer) |
| `server/providers/venice.ts` | `generateStill` HTTP client against native `/image/generate` |
| `server/providers/runpod.ts` | `trainPack` enqueue + generateStill (Soul ID adapter path + Venice fallback) |
| `server/providers/sister.ts` | Future sister private-AI company adapter slot |
| `server/providers/registry.ts` | Provider registry + stub mode |
| `server/providers/comfy/train-pack-workflow.json` | Comfy placeholder |
| `server/storage.ts` | R2/S3 (or local) object storage + presigned GET |
| `app/api/media/[id]` | Auth’d still preview (local stream or 302 to presigned R2 GET) |
| `workers/` | `generateStill` and `trainPack` BullMQ workers (trainPack polls RunPod until ready) |
| `scripts/create-invite.ts` | CLI invite mint (no UI required) |

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

### Commands

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Next.js app |
| `pnpm worker` | BullMQ workers (`generateStill`, `trainPack`) |
| `pnpm db:migrate` | Apply Drizzle SQL migrations |
| `pnpm invite:create` | Mint an invite code |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Prompt-compiler unit tests |
| `pnpm build` | Production Next.js build |
| `pnpm check` | typecheck + test + build |

`invite:create` flags: `--note=beta --max=5`.

## Provider wiring

`PROVIDER_MODE=stub` writes a tiny placeholder still and marks train jobs succeeded. Use this for local UI/API flow without vendor keys.

`PROVIDER_MODE=live`:

- `GENERATE_STILL_PROVIDER=venice` calls `POST {VENICE_API_BASE_URL}/image/generate` with `Authorization: Bearer $VENICE_API_KEY`. `safe_mode` comes from `VENICE_SAFE_MODE` (default `false` for this gated adult product). Prompt bodies are not written to application logs. Venice has **no** Soul-ID / train API — do not send LoRAs to Venice.
- When a Locked Character Pack has a stored trainPack adapter (LoRA pointer), `generateStill` uses the RunPod generate adapter instead, passing `adapterStorageKey` / source URL so identity can load. No adapter (or `PROVIDER_MODE=stub`) keeps Venice / stub as today.
- If Venice is unset/fails **and** there is no Soul ID adapter, the worker may fall back to the RunPod generate adapter when `RUNPOD_GENERATE_ENDPOINT_ID` is set — only for missing config or transient errors (503/network), not 4xx or empty-image responses. RunPod generate POSTs `/run`, stores the vendor job id, then polls `GET .../status/{id}` with delayed BullMQ jobs (same pattern as trainPack). Crash recovery re-enqueues the still (or resumes the poll) instead of failing it as stalled.
- `TRAIN_PACK_PROVIDER=runpod` posts to `POST {RUNPOD_API_BASE_URL}/{RUNPOD_TRAIN_ENDPOINT_ID}/run` with reference object keys (and, when R2 is configured, 1-hour signed GET URLs so the worker can read refs without sharing the bucket) plus the Comfy placeholder, then polls `GET .../status/{id}` until complete. On success the worker stores LoRA/adapter bytes or object-key pointers (including live-shaped nested `output` / `lora_url`). Missing adapters fail closed (`TRAIN_NO_ADAPTER`). Venice **cannot** be selected for trainPack.
- Locked pack detail: **Test grid** queues a small set of Composer stills (same `generateStill` path). **Retrain** re-queues `trainPack` with the existing refs. Generate is refused unless the pack is **Locked** and a Pose chip is set (server-side).
- `sister` adapters implement the same interfaces and are selected only when `GENERATE_STILL_PROVIDER` / `TRAIN_PACK_PROVIDER` is `sister`.

Object storage: set `S3_ENDPOINT`, `S3_BUCKET`, and keys for R2. If those are empty, stills/refs go to `.data/storage/` (gitignored). Studio previews use a short-lived presigned GET (R2, 120s) or `/api/media/:id` (local). TrainPack reference URLs are server-to-server only and use a longer TTL so RunPod can still fetch after queueing.

## What Stage 1 intentionally excludes

- Real-person likeness, face upload, celebrity/public-figure flows
- Camera controls and Advanced composer
- Full video / clip generation (button only)
- Public gallery, social, marketplace, credits/billing
- Production secrets, live provider keys in git
- Policy classifiers, C2PA, age-vendor integration, encrypted vault

## Build TODOs

- Replace self-attest with a highly effective age-assurance vendor where legally required
- Output/input policy gateway and prompt log denylist audits
- Credit ledger / adult-approved payments
- Sister-company adapter implementation once that API exists

## License

Private. Not licensed for public use.
