import z from "zod";

export const updateWorkflowMetadataBodySchema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional()
})
.refine(
    data => data.name !== undefined || data.description !== undefined,
    {message: "At least one field must be provided"}
)

export type UpdateWorkflowMetadataBodyInput = z.infer<typeof updateWorkflowMetadataBodySchema>