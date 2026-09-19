import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { loadLocalEnv } from "@/lib/load-env";
import { seedStubReviewPacks } from "@/server/demo-pack";

loadLocalEnv();

const emailArg = process.argv.find((arg) => arg.startsWith("--email="));
const email = emailArg?.slice("--email=".length).trim().toLowerCase();
if (!email) {
  console.error("Usage: pnpm demo:pack -- --email=you@example.com");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

if ((process.env.PROVIDER_MODE ?? "stub") !== "stub") {
  console.error("demo:pack only runs when PROVIDER_MODE=stub");
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client);
const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
const user = rows[0];
if (!user) {
  await client.end();
  console.error(`No user for ${email}. Redeem an invite and attest age first.`);
  process.exit(1);
}

const result = await seedStubReviewPacks(user.id);
await client.end();
console.log(`Locked demo pack: ${result.locked.name} (${result.locked.id}) status=${result.locked.status}`);
console.log(`Draft demo pack:  ${result.draft.name} (${result.draft.id}) status=${result.draft.status}`);
console.log("Open /app/create — Mara (demo) should unlock Generate once Pose is selected.");
