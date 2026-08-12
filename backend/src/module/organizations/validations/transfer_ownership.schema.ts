import z from "zod";

export const transferOwnershipParamsSchema = z.object({
    organizationId: z.cuid2(),
    memberId: z.cuid2()
})

export type TransferOwnershipParamsInput = z.infer<typeof transferOwnershipParamsSchema> 