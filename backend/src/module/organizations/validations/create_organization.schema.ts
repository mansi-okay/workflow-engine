import z from "zod";

export const createOrganizationSchema = z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional()
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>