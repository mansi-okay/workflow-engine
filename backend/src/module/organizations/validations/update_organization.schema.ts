import z from "zod";

export const updateOrganizationSchema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional()
})
.refine(
    data => Object.keys(data).length > 0,
    {message: "Proivde atleast one field"}
)

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>