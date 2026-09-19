import z from "zod";

export const createWorkflowBodySchema = z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional()
})

export type CreateWorkflowBodyInput = z.infer<typeof createWorkflowBodySchema>