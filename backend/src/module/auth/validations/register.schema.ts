import z from "zod";

export const registerSchema = z.object({
    name: z.string().trim()
    .min(2, "Name must be atleast 2 characters")
    .max(100, "Name can't exceed 100 characters"),
    email: z.email("Email must be valid").trim().toLowerCase(),
    password: z.string()
    .min(12,"Password must be atleast 12 characters")
    .max(128, "Password can't exceed 128 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number")
})

export type RegisterInput = z.infer<typeof registerSchema>