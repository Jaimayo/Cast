# Cast

Private, invite-gated adult NSFW **stills** studio. Consumers generate for themselves using a Higgsfield-like composer (chips → hidden prompt), not a raw prompt box.

This repository is the **Stage 1 scaffold**. Product/architecture locks in the Stage 1 handoff win over older PRD text where they conflict (notably: Character Pack training via RunPod **is** in scope).

## Stage 1 locks (do not reopen in this PR)

- Fictional characters only — no real-person face upload / deepfake NSFW
- Age self-attest stored as `users.age_attested_at`; no studio until set
- Stills first; ~5s clip is Phase 1.5 — UI shows **Animate later**, generation is not implemented
- Character Pack (Soul ID): generate-then-lock **or** library-train from **in-app** stills; min 12 / target ~20 refs
- Composer: Character required + Pose required for Generate; Outfit/Scene/Lighting/Body optional. Frame defaults to **3:4 portrait** (also 1:1 / 9:16 / 16:9). **No camera. No Advanced panel.**
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
| `lib/rate-limit.ts` | Per-user enqueue / invite redeem 429 guards (Redis in live; in-memory for stub/tests) |
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

## Product review on Vercel (`cast-stage1-review`)

Stub cookie-only preview. Deploy this Next.js app (not static HTML). Project build command is `pnpm vercel-build`.

Leave `PROVIDER_MODE=stub`. Do **not** set `DATABASE_URL`, `REDIS_URL`, S3/R2, Venice, or RunPod keys. Studio identity lives in the signed session cookie.

| Key | Value | Required? |
| --- | --- | --- |
| `PROVIDER_MODE` | `stub` | Recommended (defaults to stub) |
| `SESSION_SECRET` | any 32+ character string | Optional in stub (built-in review default) |
| `REVIEW_INVITE_CODE` | `castreview` | Optional (this is the default) |
| `APP_BASE_URL` | public review URL | Optional |

If `DATABASE_URL` is unset, `vercel-build` skips migrate/bootstrap and runs `next build` (memory preview). Setting `DATABASE_URL` turns the cookie-only path off and expects Postgres.

Click-through: `/` → invite `castreview` → age **I confirm I am 18+.** → `/app/characters`.

### Commands

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Next.js app |
| `pnpm worker` | BullMQ workers (`generateStill`, `trainPack`) |
| `pnpm db:migrate` | Apply Drizzle SQL migrations |
| `pnpm invite:create` | Mint an invite code |
| `pnpm review:bootstrap` | Stub-only: mint/keep the product-review invite when Postgres is set |
| `pnpm vercel-build` | Vercel: migrate+bootstrap if `DATABASE_URL`, then `next build` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Prompt-compiler unit tests |
| `pnpm build` | Production Next.js build |
| `pnpm check` | typecheck + test + build |

`invite:create` flags: `--note=beta --max=5`.

## Provider wiring

`PROVIDER_MODE=stub` writes a tiny placeholder still and marks train jobs succeeded. Use this for local UI/API flow without vendor keys.

`PROVIDER_MODE=live`:

- Flip Generate from stub → Venice: `PROVIDER_MODE=live`, `GENERATE_STILL_PROVIDER=venice`, and a real `VENICE_API_KEY`. `PROVIDER_MODE` is `stub` | `live` (not `venice`). Stub stays the default for preview.
- Flip Train & lock from stub → RunPod: `PROVIDER_MODE=live`, `TRAIN_PACK_PROVIDER=runpod` (already the default), `RUNPOD_API_KEY`, and `RUNPOD_TRAIN_ENDPOINT_ID`. Optional: `RUNPOD_API_BASE_URL` (default `https://api.runpod.ai/v2`). Restart the Next app **and** `pnpm worker`. Without the key or endpoint, live train throws `PROVIDER_NOT_CONFIGURED` (user-safe: “Training isn't configured on this server.”). Venice **cannot** train — do not set `TRAIN_PACK_PROVIDER=venice`.
- `GENERATE_STILL_PROVIDER=venice` calls native `POST {VENICE_API_BASE_URL}/image/generate` (not OpenAI-compat `/images/generations`) with `Authorization: Bearer $VENICE_API_KEY`. Default model is **`lustify-v8`** (Private on Venice’s image catalog, uncensored photoreal character stills, pixel 1024×1024). Override with `VENICE_IMAGE_MODEL`; list image models at `GET {VENICE_API_BASE_URL}/models?type=image`. `safe_mode` comes from `VENICE_SAFE_MODE` (default `false` — Cast’s fictional-adult + 18+ preflight is the policy lock; enabling Venice safe_mode would blur adult stills). Composer chips compile to hidden `prompt` / `negative_prompt`; that string is never shown in the UI or job logs. Venice has **no** Soul-ID / train API — do not send LoRAs to Venice. Pilot rate limit is ~20 image req/min; Cast’s Generate enqueue cap (12/min) stays under that. User-safe Generate failures: out of credits (402), rate limit (429), policy reject, timeout — never a stack or prompt.
- Train & lock (stub or live RunPod) persists a ready adapter identity on the Character Pack so later Generate can find it: `adapter_id`, `adapter_storage_key` (path), `adapter_status` (`none` / `pending` / `ready` / `failed`), `adapter_source` (`stub` | `live`). Retrain failure restores Locked and leaves the prior identity unchanged.
- When a Locked Character Pack has a **ready** trainPack adapter, `generateStill` uses the RunPod generate adapter instead, passing `adapterStorageKey` / source URL so identity can load. No adapter (or `PROVIDER_MODE=stub`) keeps Venice / stub as today.
- If Venice is **unset** (missing `VENICE_API_KEY`) and there is no Soul ID adapter, the worker may fall back to the RunPod generate adapter when `RUNPOD_GENERATE_ENDPOINT_ID` is set. Balance/402, rate limit, policy reject, and timeout stay on Venice and are not sent to RunPod. RunPod generate polls `GET .../status/{id}` for image bytes.
- `TRAIN_PACK_PROVIDER=runpod` posts to `POST {RUNPOD_API_BASE_URL}/{RUNPOD_TRAIN_ENDPOINT_ID}/run` with reference object keys (and, when R2 is configured, 1-hour signed GET URLs so the worker can read refs without sharing the bucket) plus the Comfy placeholder, then polls `GET .../status/{id}` until complete. On success the worker stores LoRA/adapter bytes or object-key pointers (including live-shaped nested `output` / `lora_url`). Missing adapters fail closed (`TRAIN_NO_ADAPTER`). User-safe Train failures: not configured, out of credits (402), rate limit (429), timeout, train failed — never a stack, prompt, or RunPod dump. Venice **cannot** be selected for trainPack. Train & lock is **not** cancellable from Jobs (one-at-a-time still applies).
- Locked pack detail: **Test grid** queues a small set of Composer stills (same `generateStill` path). **Retrain** re-queues `trainPack` with the existing refs. Generate is refused unless the pack is **Locked** and a Pose chip is set (server-side).
- Enqueue abuse: invite redeem, Generate, Train & lock, and generate-starters are per-user (invite also per IP) sliding-window rate limited. Live mode stores the window in **Redis** so multiple app instances share the same caps. Too many queued/running jobs return **429** with a distinct `code` (`GENERATE_STILL_RATE_LIMIT`, `TRAIN_PACK_BUSY`, …) plus `Retry-After`. `PROVIDER_MODE=stub` and unit tests keep the in-memory limiter (no Redis required). If Redis is unreachable in live mode, the limiter falls back to in-memory so the request still succeeds, with caps local to that instance.
- Jobs list/get (and enqueue 202 bodies) include `ageSeconds`, `attemptCount`, `lastErrorCode`, and `lastError` (user-safe copy — never a prompt or provider payload). Create uses `lastError` when Generate fails. Queued/generating stills show queue-wait or “Generating this still…” copy. `POST /api/jobs/:id/cancel` cancels queued or generating stills (and starters); Train & lock is refused with a user-safe reason. Canceled is not a failure.
- Character Pack refs: attaching a starter or library still to `training_set_assets` is atomic (pack row lock + unique pack+media). Duplicate attach is a no-op; a 21st ref is rejected (`PACK_REFS_FULL`). Lock / Train & lock re-count inside the same transaction and refuse below 12 (`PACK_REFS_TOO_FEW`, with the current count). `/api/generate-starters` returns user-safe `code`s (`INVALID_STARTER`, `PACK_NOT_FOUND`, `INVALID_PACK_STATE`) — never a hidden vibe fragment.
- `sister` adapters implement the same interfaces and are selected only when `GENERATE_STILL_PROVIDER` / `TRAIN_PACK_PROVIDER` is `sister`.

Object storage: set `S3_ENDPOINT`, `S3_BUCKET`, and keys for R2. If those are empty, stills/refs go to `.data/storage/` (gitignored). Studio previews use a short-lived presigned GET (R2, 120s) or `/api/media/:id` (local). TrainPack reference URLs are server-to-server only and use a 1-hour TTL so RunPod can still fetch after queueing.

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
