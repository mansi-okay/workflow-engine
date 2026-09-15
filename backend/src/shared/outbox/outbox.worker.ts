import { outboxRepository } from "../../container/outbox.container.js";
import { logger } from "../../lib/logger.js";
import { processOutboxEvent } from "./outbox.processor.js";

export async function processOutboxEvents(): Promise<void> {
    const events = await outboxRepository.findPending(10)

    for(const event of events){

        const claimed = await outboxRepository.claimPending(event.id)

        if (!claimed){
            continue
        }

        try {
            await processOutboxEvent(event)

            await outboxRepository.markCompleted(event.id)

            logger.info(
                {
                    outboxEventId: event.id
                }, "Outbox event processed"
            )
        } catch (error) {
            
            await outboxRepository.markFailed(event.id)
            
            logger.error(
                {
                    outboxEventId: event.id,
                    error
                }, "Outbox event failed"
            )
        }
    }
}