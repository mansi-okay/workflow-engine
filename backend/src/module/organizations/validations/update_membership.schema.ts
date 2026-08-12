import { Role } from "@prisma/client";
import z from "zod";

export const updateMembershipParamsSchema = z.object({
    organizationId: z.cuid2(),
    memberId: z.cuid2()
})

export const updateMembershipBodySchema = z.object({
    newRole: z.enum(Role)
})


export type UpdateMembershipParamsInput = z.infer<typeof updateMembershipParamsSchema>
export type UpdateMembershipBodyInput = z.infer<typeof updateMembershipBodySchema>