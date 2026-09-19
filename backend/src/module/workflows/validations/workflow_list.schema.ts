import z from "zod";
import { paginationSchema } from "../../../shared/validators/pagination.schema.js";

export const workflowListQuerySchema = paginationSchema.extend({
    search: z.string().trim().min(1).max(100).optional()
})

export type WorkflowListQueryInput = z.infer<typeof workflowListQuerySchema>