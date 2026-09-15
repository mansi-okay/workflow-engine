import { env } from "../../config/env.js";
import { resend } from "../../lib/resend.client.js";
import type { EmailJobData } from "../../queue/email/email.types.js";
import { EmailSendError } from "../../shared/error/HttpErrors.js";

export class EmailService{

    async sendEmail(data: EmailJobData): Promise<void>{
        const {error} = await resend.emails.send({
            from: env.EMAIL_FROM,
            to:data.to,
            subject:data.subject,
            text:data.text
        },
        {
            idempotencyKey: data.idempotencyKey
        }
    )

        if (error){
            throw new EmailSendError(error.message)
        }
    }
}