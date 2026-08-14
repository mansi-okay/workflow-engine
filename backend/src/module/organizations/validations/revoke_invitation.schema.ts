import z from "zod";

export const revokeInvitationParamsSchema = z.object({
    organizationId: z.cuid2(),
    invitationId: z.cuid2()
})

export type RevokeInvitationParamsInput = z.infer<typeof revokeInvitationParamsSchema>