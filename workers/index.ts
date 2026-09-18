import { Worker } from "bullmq";
import { JOB_QUEUES } from "@/lib/constants";
import { redisConnection } from "@/server/redis";
import { processGenerateStillJob } from "@/workers/generateStill";
import { processTrainPackJob } from "@/workers/trainPack";
import type { GenerateStillJobData, TrainPackJobData } from "@/server/queue";

function log(message: string, extra?: Record<string, string>) {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[cast-worker] ${message}${payload}`);
}

const generateWorker = new Worker<GenerateStillJobData>(
  JOB_QUEUES.generateStill,
  async (job) => {
    log("generateStill start", { jobId: job.data.generationJobId });
    await processGenerateStillJob(job.data.generationJobId);
    log("generateStill done", { jobId: job.data.generationJobId });
  },
  { connection: redisConnection(), concurrency: 2 },
);

const trainWorker = new Worker<TrainPackJobData>(
  JOB_QUEUES.trainPack,
  async (job) => {
    log("trainPack start", { jobId: job.data.generationJobId, packId: job.data.characterPackId });
    await processTrainPackJob(job.data.generationJobId, job.data.characterPackId);
    log("trainPack done", { jobId: job.data.generationJobId });
  },
  { connection: redisConnection(), concurrency: 1 },
);

for (const worker of [generateWorker, trainWorker]) {
  worker.on("failed", (job, err) => {
    log("job failed", {
      queue: worker.name,
      id: job?.id ?? "unknown",
      error: err.message,
    });
  });
}

async function shutdown() {
  log("shutting down");
  await Promise.all([generateWorker.close(), trainWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

log("workers online", { queues: `${JOB_QUEUES.generateStill},${JOB_QUEUES.trainPack}` });
