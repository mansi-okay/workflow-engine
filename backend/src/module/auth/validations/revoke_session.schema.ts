import z from "zod";

export const revokeSessionSchema = z.object({
    sessionId: z.cuid2()
})

export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>