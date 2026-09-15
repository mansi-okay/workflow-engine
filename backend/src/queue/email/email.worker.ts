import { Worker } from "bullmq";
import { EmailJobData } from "./email.types.js";
import { processEmailJob } from "./email.processor.js";
import { bullmqRedis } from "../../lib/redis/redis.bullmq.js";
import { logger } from "../../lib/logger.js";

export const emailWorker = new Worker<EmailJobData>(
    "email",
    processEmailJob,
    {
        connection: bullmqRedis,
        concurrency: 5
    }
)

emailWorker.on("ready",() => {
    logger.info("Email worker ready")
})

emailWorker.on("active",(job) => {
    logger.info(`Email job ${job.id} started`)
})

emailWorker.on("completed",(job) => {
    logger.info(`Email job ${job.id} completed`)
})

emailWorker.on("failed",(job, error) => {
    logger.error(
        {
            jobId: job?.id,
            error
        }, "Email job failed"
    )
})

emailWorker.on("stalled",(jobId) => {
    logger.warn(`Email job ${jobId} stalled`)
})

emailWorker.on("error", (error) => {
    logger.error(error, "Email worker error")
})