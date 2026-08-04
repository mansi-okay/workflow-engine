import z from "zod";

export const resendVerificationEmailSchema = z.object({
    email: z.email().trim().toLowerCase()
})

export type ResendVerificationEmailInput = z.infer<typeof resendVerificationEmailSchema>