import z from "zod";

export const resetPasswordQuerySchema = z.object({
    token: z.string()
    .trim()
    .length(64)
    .regex(/^[a-f0-9]+$/i, "Invalid token format")
})

export const resetPasswordBodySchema = z.object({
    newPassword: z.string()
    .min(12,"Password must be atleast 12 characters")
    .max(128, "Password can't exceed 128 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number")
})

export type ResetPasswordQueryInput = z.infer<typeof resetPasswordQuerySchema>
export type ResetPasswordBodyInput = z.infer<typeof resetPasswordBodySchema>