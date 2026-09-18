import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { loadLocalEnv } from "@/lib/load-env";

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "../db/migrations");
const client = postgres(databaseUrl, { max: 1 });

await migrate(drizzle(client), { migrationsFolder });
await client.end();
console.log("Migrations applied.");
