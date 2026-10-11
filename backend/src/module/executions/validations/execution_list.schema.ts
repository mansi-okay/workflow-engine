import { ExecutionStatus } from "@prisma/client";
import { cuidV1Schema } from "../../../shared/validations/cuid.schema.js";
import { paginationSchema } from "../../../shared/validations/pagination.schema.js";
import z from "zod";

export const executionListQuerySchema = paginationSchema.extend({
    status: z.enum(ExecutionStatus).optional(),
    workflowId: cuidV1Schema.optional()
})

export type ExecutionListQueryInput = z.infer<typeof executionListQuerySchema>