import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "server/**/*.test.ts"],
    env: {
      SESSION_SECRET: "test-session-secret-not-for-prod-use-32b",
      DATABASE_URL: "postgres://cast:cast@localhost:5432/cast",
      PROVIDER_MODE: "stub",
    },
  },
});
