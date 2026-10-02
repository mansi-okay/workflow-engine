import z from "zod";

export const rollbackWorkflowVersionSchema = z.object({
    workflowVersionId: z.cuid2()
})

export type RollbackWorkflowVersionBodyInput = z.infer<typeof rollbackWorkflowVersionSchema>