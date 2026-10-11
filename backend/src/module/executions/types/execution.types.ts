import type { Execution, TriggerType } from "@prisma/client";
import type { TriggerOutput } from "../../../registry/node_type.registry.js";
import type { PaginationMeta } from "../../../shared/types/pagination.types.js";

export type CreateExecutionInput = {
    workflowId: string
    workflowVersionId: string
    triggerType: TriggerType
    input?: TriggerOutput
}

export type ExecutionListResult = {
    executions: Execution[]
    pagination: PaginationMeta
}