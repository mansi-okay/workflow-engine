import z from "zod";

export const workflowVersionCursorSchema = z.object({
    versionNumber: z.number().int().positive(),
})

export type WorkflowVersionCursor = z.infer<typeof workflowVersionCursorSchema>