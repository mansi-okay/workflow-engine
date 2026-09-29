import z from "zod";

export const workflowVersionParamsSchema = z.object({
    organizationId: z.cuid2(),
    workflowId: z.cuid2(),
    workflowVersionId: z.cuid2()
})

export type WorkflowVersionParamsInput = z.infer<typeof workflowVersionParamsSchema>