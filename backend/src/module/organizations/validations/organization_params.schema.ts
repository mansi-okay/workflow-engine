import z from "zod";

export const organizationParamsSchema = z.object({
    organizationId: z.cuid2()
})

export type OrganizationParamsInput = z.infer<typeof or