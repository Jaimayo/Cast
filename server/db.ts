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
    const client = globalForDb.postgres ?? postgres(getEnv().databaseUrl, { max: 5 });
    globalForDb.postgres = client;
    globalForDb.drizzle = drizzle(client, { schema });
  }
  return globalForDb.drizzle;
}
