import z from "zod";

export const workflowCursorSchema = z.object({
    timestamp: z.coerce.date(),
    id: z.string().min(1)
})

export type WorkflowCursor = z.infer<typeof workflowCursorSchema>