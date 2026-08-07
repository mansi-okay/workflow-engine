import z, { email } from "zod";

export const forgotPasswordSchema = z.object({
    email: z.email().trim().toLowerCase()
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>