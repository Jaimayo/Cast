import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { inviteCodes } from "@/db/schema";
import { newInviteCode } from "@/lib/invite-code";
import { loadLocalEnv } from "@/lib/load-env";

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const noteArg = process.argv.find((arg) => arg.startsWith("--note="));
const maxArg = process.argv.find((arg) => arg.startsWith("--max="));
const note = noteArg?.slice("--note=".length) ?? "cli";
const maxUses = Number(maxArg?.slice("--max=".length) ?? "1");

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client);
const code = newInviteCode();
const rows = await db.insert(inviteCodes).values({ code, note, maxUses }).returning();
const invite = rows[0];
await client.end();

if (!invite) {
  console.error("Failed to insert invite");
  process.exit(1);
}

console.log(`Invite created: ${invite.code}`);
console.log(`id=${invite.id} maxUses=${invite.maxUses} note=${invite.note ?? ""}`);
