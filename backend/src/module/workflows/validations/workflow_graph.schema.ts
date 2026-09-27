import z from "zod";

const positionSchema = z.object({
    x: z.number(),
    y: z.number()
}).strict()

const nodeSchema = z.object({
    nodeKey: z.string().trim().min(1).max(100),
    type: z.string().min(1),
    config: z.record(z.string(), z.unknown()),
    position: positionSchema.nullable().optional()
}).strict()

const edgeSchema = z.object({
    sourceNodeKey:z.string().trim().min(1).max(100),
    targetNodeKey:z.string().trim().min(1).max(100)
}).strict()

export const workflowGraphSchema = z.object({
    revision: z.number().int().positive(),
    nodes: z.array(nodeSchema),
    edges: z.array(edgeSchema)
}).strict()

export type WorkflowGraphBodyInput = z.infer<typeof workflowGraphSchema>
export type EdgeInput = z.infer<typeof edgeSchema>
export type NodeInput = z.infer<typeof nodeSchema>