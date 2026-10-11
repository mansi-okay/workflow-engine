import type { Execution } from "@prisma/client";
import type { ExecutionResponseDto } from "../dtos/execution_response.dto.js";
import { toJsonValue } from "../../../shared/utils/common/toJsonValue.js";

export const toExecutionResponseDto = (data: Execution): ExecutionResponseDto => ({
    id: data.id,
    workflowId: data.workflowId,
    workflowVersionId: data.workflowVersionId,
    status: data.status,
    triggerType: data.triggerType,
    startedAt: data.startedAt?.toISOString() ?? null,
    completedAt: data.completedAt?.toISOString() ?? null,
    input: data.input === null ? null : toJsonValue(data.input),
    error: data.error === null ? null : toJsonValue(data.error),
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString()
})