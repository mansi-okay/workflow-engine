import z from "zod";

export const runWorkflowBodySchema = z.object({
    input: z.record(z.string(), z.unknown())
}).strict()

export type RunWorkflowBodyInput = z.infer<typeof runWorkflowBodySchema>