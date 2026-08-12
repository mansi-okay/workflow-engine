import z from "zod";

export const removeMemberParamsSchema = z.object({
    organizationId: z.cuid2(),
    memberId: z.cuid2()
})

export type RemoveMemberParamsInput = z.infer<typeof removeMemberParamsSchema> 