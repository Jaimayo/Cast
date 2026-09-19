import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { getEnv } from "@/server/env";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  postgres?: ReturnType<typeof postgres>;
  drizzle?: Db;
};

export function getDb(): Db {
  if (!globalForDb.drizzle) {
    const databaseUrl = getEnv().databaseUrl;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required outside stub memory preview");
    }
    const client = globalForDb.postgres ?? postgres(databaseUrl, { max: 5 });
    globalForDb.postgres = client;
    globalForDb.drizzle = drizzle(client, { schema });
  }
  return globalForDb.drizzle;
}
