import { Queue, type JobsOptions } from "bullmq";
import { JOB_QUEUES } from "@/lib/constants";
import {
  GENERATE_STILL_BACKOFF_MS,
  GENERATE_STILL_MAX_ATTEMPTS,
  TRAIN_PACK_BACKOFF_MS,
  TRAIN_PACK_MAX_ATTEMPTS,
  deadLetterBullJobId,
  generateStillBullJobId,
  generateStillRecoverBullJobId,
  isDuplicateBullJobError,
  trainPackBullJobId,
} from "@/lib/job-errors";
import { redisConnection } from "@/server/redis";
import { generatePollDelayMs } from "@/server/providers/generate-output";
import { trainPollDelayMs } from "@/server/providers/train-status";

export type GenerateStillJobData = {
  generationJobId: string;
  attempt?: number;
};

export type TrainPackJobData = {
  generationJobId: string;
  characterPackId: string;
  attempt?: number;
};

export type DeadLetterJobData = {
  sourceQueue: string;
  generationJobId: string;
  characterPackId?: string;
  errorCode: string;
  errorMessage: string;
  attemptsMade: number;
};

export const GENERATE_STILL_JOB_OPTIONS: JobsOptions = {
  attempts: GENERATE_STILL_MAX_ATTEMPTS,
  backoff: { type: "exponential", delay: GENERATE_STILL_BACKOFF_MS },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500 },
};

export const TRAIN_PACK_JOB_OPTIONS: JobsOptions = {
  attempts: TRAIN_PACK_MAX_ATTEMPTS,
  backoff: { type: "exponential", delay: TRAIN_PACK_BACKOFF_MS },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500 },
};

const globalForQueues = globalThis as unknown as {
  generateStillQueue?: Queue<GenerateStillJobData>;
  trainPackQueue?: Queue<TrainPackJobData>;
  deadLetterQueue?: Queue<DeadLetterJobData>;
};

export function getGenerateStillQueue(): Queue<GenerateStillJobData> {
  globalForQueues.generateStillQueue ??= new Queue<GenerateStillJobData>(JOB_QUEUES.generateStill, {
    connection: redisConnection(),
    defaultJobOptions: GENERATE_STILL_JOB_OPTIONS,
  });
  return globalForQueues.generateStillQueue;
}

export function getTrainPackQueue(): Queue<TrainPackJobData> {
  globalForQueues.trainPackQueue ??= new Queue<TrainPackJobData>(JOB_QUEUES.trainPack, {
    connection: redisConnection(),
    defaultJobOptions: TRAIN_PACK_JOB_OPTIONS,
  });
  return globalForQueues.trainPackQueue;
}

export function getDeadLetterQueue(): Queue<DeadLetterJobData> {
  globalForQueues.deadLetterQueue ??= new Queue<DeadLetterJobData>(JOB_QUEUES.deadLetter, {
    connection: redisConnection(),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
    },
  });
  return globalForQueues.deadLetterQueue;
}

async function addIdempotent<T>(
  queue: { add: (name: string, data: T, opts?: JobsOptions) => Promise<unknown> },
  name: string,
  data: T,
  jobId: string,
  extra?: JobsOptions,
): Promise<void> {
  try {
    await queue.add(name, data, { jobId, ...extra });
  } catch (err) {
    if (isDuplicateBullJobError(err)) return;
    throw err;
  }
}

export async function enqueueGenerateStillJob(generationJobId: string): Promise<void> {
  await addIdempotent(
    getGenerateStillQueue(),
    "generateStill",
    { generationJobId, attempt: 0 },
    generateStillBullJobId(generationJobId),
    GENERATE_STILL_JOB_OPTIONS,
  );
}

export async function enqueueGenerateStillPollJob(data: GenerateStillJobData): Promise<void> {
  const attempt = data.attempt ?? 0;
  await addIdempotent(
    getGenerateStillQueue(),
    "generateStill",
    { generationJobId: data.generationJobId, attempt },
    generateStillBullJobId(data.generationJobId, attempt),
    attempt > 0
      ? { ...GENERATE_STILL_JOB_OPTIONS, delay: generatePollDelayMs(attempt) }
      : GENERATE_STILL_JOB_OPTIONS,
  );
}

/** Resume generate after a worker crash. Same job id on every scan — no stacked RunPod /run. */
export async function enqueueGenerateStillRecoverJob(data: GenerateStillJobData): Promise<void> {
  await addIdempotent(
    getGenerateStillQueue(),
    "generateStill",
    { generationJobId: data.generationJobId, attempt: data.attempt ?? 0 },
    generateStillRecoverBullJobId(data.generationJobId),
    GENERATE_STILL_JOB_OPTIONS,
  );
}

export async function enqueueTrainPackJob(data: TrainPackJobData): Promise<void> {
  const attempt = data.attempt ?? 0;
  await addIdempotent(
    getTrainPackQueue(),
    "trainPack",
    { ...data, attempt },
    trainPackBullJobId(data.generationJobId, attempt),
    attempt > 0
      ? { ...TRAIN_PACK_JOB_OPTIONS, delay: trainPollDelayMs(attempt) }
      : TRAIN_PACK_JOB_OPTIONS,
  );
}

export async function enqueueDeadLetterJob(data: DeadLetterJobData): Promise<void> {
  await addIdempotent(
    getDeadLetterQueue(),
    "deadLetter",
    data,
    deadLetterBullJobId(data.sourceQueue, data.generationJobId),
  );
}
