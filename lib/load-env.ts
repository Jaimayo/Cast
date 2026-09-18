import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Fill missing process.env keys from `.env` then `.env.local`. Next.js already does this for `pnpm dev`. */
export function loadLocalEnv(): void {
  for (const name of [".env", ".env.local"]) {
    const file = path.resolve(process.cwd(), name);
    if (!existsSync(file)) {
      continue;
    }
    for (const raw of readFileSync(file, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }
      const eq = line.indexOf("=");
      if (eq <= 0) {
        continue;
      }
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}
