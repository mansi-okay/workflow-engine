import z from "zod"

export const leaveOrganizationParamsSchema = z.object({
    organizationId: z.cuid2()
})

export type LeaveOrganizationParamsInput = z.infer<typeof leaveOrganizationParamsSchema>