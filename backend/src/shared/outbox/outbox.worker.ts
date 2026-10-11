import { outboxRepository } from "../../container/outbox.container.js";
import { logger } from "../../lib/logger.js";
import { processOutboxEvent } from "./outbox.processor.js";

export async function processOutboxEvents(): Promise<void> {
    const events = await outboxRepository.findPending(10)

    for(const event of events){

        const claim = await outboxRepository.claimPending(event.id)

        if (claim === null){
            continue
        }

        try {
            await processOutboxEvent(event)

            const completed = await outboxRepository.markCompleted(
                event.id,
                claim.claimToken
            )

            if (!completed) {
                logger.warn(
                    { outboxEventId: event.id },
                    "Outbox completion skipped. Claim is no longer valid"
                )
                continue
            }

            logger.info(
                {
                    outboxEventId: event.id
                }, "Outbox event processed"
            )
        } catch (error) {
            // TODO: Later — classify permanent vs transient Outbox errors, add a Dead Letter Queue (DLQ),
            //  and define a max-attempt policy for permanently failing events
            
            try {
                const failed = await outboxRepository.markFailed(
                    event.id, 
                    claim.attempts,
                    claim.claimToken
                )

                if (!failed) {
                    logger.warn(
                        { outboxEventId: event.id },
                        "Outbox failure update skipped. Claim is no longer valid"
                    )
                }
            } catch (error) {
                logger.error(
                    {
                        outboxEventId: event.id,
                        error
                    },
                    "Failed to update outbox event after processing failure"
                )
            }
            
            logger.error(
                {
                    outboxEventId: event.id,
                    error
                }, "Outbox event failed"
            )
        }
    }
}