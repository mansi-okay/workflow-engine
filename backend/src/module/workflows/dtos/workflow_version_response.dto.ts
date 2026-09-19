import type { WorkflowVersionStatus } from "@prisma/client"

export type WorkflowVersionResponseDto = {
    id: string
    workflowId: string
    versionNumber: number
    status: WorkflowVersionStatus
    createdBy: string | null
    createdAt: string
    updatedAt: string
    publishedBy: string | null
    publishedAt: string | null
}