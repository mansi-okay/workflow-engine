import z from "zod";

export const workflowParamsSchema = z.object({
    organizationId: z.cuid2(),
    workflowId: z.cuid2()
})

export type WorkflowParamsInput = z.infer<typeof workflowParamsSchema>