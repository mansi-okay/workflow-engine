import { outboxRepository } from "../../container/outbox.container.js";
import { logger } from "../../lib/logger.js";

export async function recoverStaleOutboxEvents(): Promise<void> {
    const staleBefore = new Date(Date.now() - 5 * 60 * 1000);

    const recovered = await outboxRepository.recoverStaleProcessing(
        staleBefore
    )

    if (recovered > 0) {
        logger.warn(
            { recovered },
            "Recovered stale outbox events"
        )
    }
}