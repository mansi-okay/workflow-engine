import type { ExecutionStatus, TriggerType } from "@prisma/client"
import type { JsonValue } from "../../../shared/types/json.types.js"

export type ExecutionResponseDto = {
    id : string
    workflowId: string
    workflowVersionId: string
    status: ExecutionStatus
    triggerType: TriggerType
    startedAt: string | null
    completedAt: string | null
    input: JsonValue | null
    error: JsonValue | null
    createdAt: string
    updatedAt: string
}