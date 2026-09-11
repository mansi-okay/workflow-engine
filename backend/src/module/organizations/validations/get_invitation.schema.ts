import z from "zod"

export const getInvitationParamsSchema = z.object({
    token: z.string()
        .trim()
        .length(64)
        .regex(/^[a-f0-9]+$/i, "Invalid token format")
})

export type GetInvitationParamsInput = z.infer<typeof getInvitationParamsSchema>