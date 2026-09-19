import z from "zod";

export const sessionCursorSchema = z.object({
    lastUsedAt: z.coerce.date(),
    createdAt: z.coerce.date(),
    id: z.string().min(1)
})

export type SessionCursor = z.infer<typeof sessionCursorSchema>