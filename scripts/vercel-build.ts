import { spawnSync } from "node:child_process";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.DATABASE_URL) {
  console.log("Applying database migrations…");
  run("pnpm", ["db:migrate"]);
  console.log("Bootstrapping stub review invite…");
  run("pnpm", ["review:bootstrap"]);
} else {
  console.warn(
    "DATABASE_URL is unset; stub memory preview. next build still runs. No Redis/R2/RunPod required.",
  );
}

run("pnpm", ["exec", "next", "build"]);
