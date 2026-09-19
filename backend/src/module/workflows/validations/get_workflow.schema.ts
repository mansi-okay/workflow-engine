import z from "zod";

export const getWorkflowParamsSchema = z.object({
    organizationId: z.cuid2(),
    workflowId: z.cuid2()
})

export type GetWorkflowParamsInput = z.infer<typeof getWorkflowParamsSchema>