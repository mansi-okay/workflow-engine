import z from "zod";

export const executionCursorSchema =  z.object({
    timestamp: z.coerce.date(),
    id: z.string().min(1)
})

export type ExecutionCursor = z.infer<typeof executionCursorSchema>