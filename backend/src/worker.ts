import { logger } from "./lib/logger.js";
import { emailWorker } from "./queue/email/email.worker.js";
import { bullmqRedis } from "./lib/redis/redis.bullmq.js";
import { processOutboxEvents } from "./shared/outbox/outbox.worker.js";

logger.info("Worker process started")

const OUTBOX_POLL_INTERVAL = 5000

const outboxInterval = setInterval(() => {
    void processOutboxEvents()
},OUTBOX_POLL_INTERVAL)

let isShuttingDown = false

async function shutDown(signal:string) {
    
    if(isShuttingDown){
        return
    }

    isShuttingDown = true

    logger.info(`${signal} has been recieved. Shutting down the worker`)

    try {
        clearInterval(outboxInterval)
        
        await emailWorker.close()
        await bullmqRedis.quit()

        logger.info("Worker shutdown completed")
        
        process.exit(0)
    } catch (error) {
        logger.error(error, "Worker shutdown failed")
        process.exit(1)
    }
}

process.on("SIGINT", () => {
    void shutDown("SIGINT")
})

process.on("SIGTERM", () => {
    void shutDown("SIGTERM")
})