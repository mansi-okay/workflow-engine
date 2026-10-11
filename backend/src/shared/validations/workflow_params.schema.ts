import z from "zod";
import { cuidV1Schema } from "./cuid.schema.js";

export const workflowParamsSchema = z.object({
    organizationId: cuidV1Schema,
    workflowId: cuidV1Schema
})

export type WorkflowParamsInput = z.infer<typeof workflowParamsSchema>