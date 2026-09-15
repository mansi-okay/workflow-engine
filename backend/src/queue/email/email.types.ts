export interface EmailJobData {
    to: string
    subject: string
    text: string,
    idempotencyKey: string
}