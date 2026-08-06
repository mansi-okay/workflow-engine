import z from "zod";

export const loginSchema = z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string()
    .min(12,"Password must be atleast 12 characters")
    .max(128, "Password can't exceed 128 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number")
})

export type LoginInput = z.infer<typeof loginSchema>