import { Queue, type JobsOptions } from "bullmq";
import { JOB_QUEUES } from "@/lib/constants";
import {
  GENERATE_STILL_BACKOFF_MS,
  GENERATE_STILL_MAX_ATTEMPTS,
  TRAIN_PACK_BACKOFF_MS,
  TRAIN_PACK_MAX_ATTEMPTS,
} from "@/lib/job-errors";
import { redisConnection } from "@/server/redis";

export type GenerateStillJobData = {
  generationJobId: string;
};

export type TrainPackJobData = {
  generationJobId: string;
  characterPackId: string;
  attempt?: number;
};

export const GENERATE_STILL_JOB_OPTIONS: JobsOptions = {
  attempts: GENERATE_STILL_MAX_ATTEMPTS,
  backoff: { type: "exponential", delay: GENERATE_STILL_BACKOFF_MS },
};

export const TRAIN_PACK_JOB_OPTIONS: JobsOptions = {
  attempts: TRAIN_PACK_MAX_ATTEMPTS,
  backoff: { type: "exponential", delay: TRAIN_PACK_BACKOFF_MS },
};

const globalForQueues = globalThis as unknown as {
  generateStillQueue?: Queue<GenerateStillJobData>;
  trainPackQueue?: Queue<TrainPackJobData>;
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
