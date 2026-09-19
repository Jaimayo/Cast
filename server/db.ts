import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { DatabaseRequiredError } from "@/lib/db-errors";
import { getEnv } from "@/server/env";

type Db = ReturnType<typeof drizzle<typeof schema>>;

export { DatabaseRequiredError };

const globalForDb = globalThis as unknown as {
  postgres?: ReturnType<typeof postgres>;
  drizzle?: Db;
};

export function getDb(): Db {
  const databaseUrl = getEnv().databaseUrl;
  if (!databaseUrl) {
    throw new DatabaseRequiredError();
  }
  if (!globalForDb.drizzle) {
    const client = globalForDb.postgres ?? postgres(databaseUrl, { max: 5 });
    globalForDb.postgres = client;
    globalForDb.drizzle = drizzle(client, { schema });
  }
  return globalForDb.drizzle;
}
