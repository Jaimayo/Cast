import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { inviteCodes } from "@/db/schema";
import { loadLocalEnv } from "@/lib/load-env";
import {
  REVIEW_INVITE_MAX_USES,
  REVIEW_INVITE_NOTE,
  stubReviewInviteCode,
} from "@/lib/review-preview";

loadLocalEnv();

const providerMode = process.env.PROVIDER_MODE ?? "stub";
const code = stubReviewInviteCode(providerMode, process.env.REVIEW_INVITE_CODE);
if (!code) {
  console.log("Skipping review invite (PROVIDER_MODE is not stub).");
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to bootstrap the stub review invite");
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client);
const existing = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
const row = existing[0];
if (!row) {
  await db.insert(inviteCodes).values({
    code,
    note: REVIEW_INVITE_NOTE,
    maxUses: REVIEW_INVITE_MAX_USES,
  });
  console.log(`Stub review invite created: ${code} (maxUses=${REVIEW_INVITE_MAX_USES})`);
} else {
  await db
    .update(inviteCodes)
    .set({
      revokedAt: null,
      expiresAt: null,
      maxUses: Math.max(row.maxUses, REVIEW_INVITE_MAX_USES),
      note: REVIEW_INVITE_NOTE,
    })
    .where(eq(inviteCodes.id, row.id));
  console.log(`Stub review invite ready: ${code}`);
}
await client.end();
