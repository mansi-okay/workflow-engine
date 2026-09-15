import type { Job } from "bullmq";
import type { EmailJobData } from "./email.types.js";
import { emailService } from "../../container/email.container.js";
    
export async function processEmailJob(
    job: Job<EmailJobData>
): Promise<void> {

    await emailService.sendEmail(job.data)

}