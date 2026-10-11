import { logger } from "./lib/logger.js";
import { emailWorker } from "./queue/email/email.worker.js";
import { bullmqRedis } from "./lib/redis/redis.bullmq.js";
import { processOutboxEvents } from "./shared/outbox/outbox.worker.js";
import { recoverStaleOutboxEvents } from "./shared/outbox/outbox.recovery.js";

logger.info("Worker process started")

const OUTBOX_POLL_INTERVAL = 5000
const OUTBOX_RECOVERY_INTERVAL = 60_000

let isShuttingDown = false
let isPolling = false
let isRecovering = false

let activePoll: Promise<void> | null = null
let activeRecovery: Promise<void> | null = null

const outboxInterval = setInterval(() => {
    if (isPolling || isShuttingDown) return
    isPolling = true

    activePoll = processOutboxEvents()
    .catch((error) => {
        logger.error({ error }, "Outbox polling failed")
    })
    .finally(() => {
        isPolling = false  // prevents starting polling if current polling is still running
        activePoll = null
    })
},OUTBOX_POLL_INTERVAL)

const recoveryInterval = setInterval(() => {
    if (isRecovering || isShuttingDown) return
    isRecovering = true

    activeRecovery = recoverStaleOutboxEvents()
    .catch((error) => {
        logger.error({ error }, "Outbox recovery failed")
    })
    .finally(() => {
        isRecovering = false
        activeRecovery = null
    })
}, OUTBOX_RECOVERY_INTERVAL)

async function shutDown(signal:string) {
    
    if(isShuttingDown){
        return
    }

    isShuttingDown = true  // prevents multiple shut down tries if if shut down is ongoing

    logger.info(`${signal} has been recieved. Shutting down the worker`)

    try {
        // used to stop scheduling new taska
        clearInterval(outboxInterval)
        clearInterval(recoveryInterval)

        await Promise.all([
            activePoll,
            activeRecovery
        ])

        await emailWorker.close()
        // await executionWorker.close()
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