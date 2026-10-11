import { OutboxEventType, type OutboxEvent } from "@prisma/client";
import { emailQueue } from "../../queue/email/email.queue.js";
import { AppError } from "../error/AppError.js";
import type { EmailJobData } from "../../queue/email/email.types.js";
import type { ExecutionJobData } from "../../queue/execution/execution.types.js";
import { executionQueue } from "../../queue/execution/execution.queue.js";

export async function processOutboxEvent(event:OutboxEvent): Promise<void> {
    switch(event.type){
        case OutboxEventType.SEND_INVITATION_EMAIL: {
            const payload = event.payload as unknown as EmailJobData

            await emailQueue.add(
                "send-invitation-email",
                payload,
                {
                    deduplication: {
                        id: event.id
                    }
                }
            )

            break
        }

        case OutboxEventType.SEND_VERIFICATION_EMAIL: {
            const payload = event.payload as unknown as EmailJobData

            await emailQueue.add(
                "send-verification-email",
                payload,
                {
                    deduplication: {
                        id: event.id
                    }
                }
            )
            break
        }

        case OutboxEventType.SEND_PASSWORD_RESET_EMAIL: {
            const payload = event.payload as unknown as EmailJobData

            await emailQueue.add(
                "password-reset",
                payload,
                {
                    deduplication: {
                        id: event.id
                    }
                }
            )

            break
        }

        case OutboxEventType.SEND_PASSWORD_RESET_SUCCESS_EMAIL: {
            const payload = event.payload as unknown as EmailJobData

            await emailQueue.add(
                "password-reset-success",
                payload,
                {
                    deduplication: {
                        id: event.id
                    }
                }
            )

            break
        }

        case OutboxEventType.SEND_EMAIL_VERIFICATION_SUCCESS_EMAIL: {
            const payload = event.payload as unknown as EmailJobData
            
            await emailQueue.add(
                "email-verification-success",
                payload,
                {
                    deduplication: {
                        id:event.id
                    }
                }
            )

            break
        }

        case OutboxEventType.WORKFLOW_EXECUTION_REQUESTED: {
            const payload = event.payload as unknown as ExecutionJobData

            await executionQueue.add(
                "workflow execution requested",
                payload,
                {
                // job id better because it prevents another job with same id from getting added
                //  until job not removed from queue (whether completed or failed jobs)
                    jobId: event.id 
                }
            )

            break
        }
        
        default:
            throw new AppError(`Unsupported outbox event: ${event.type}`, 500)
    }
}