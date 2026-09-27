import type { WorkflowVersionStatus } from "@prisma/client"
import type { NodeResponseDto } from "./node_response.dto.js"
import type { EdgeResponseDto } from "./edge_response.dto.js"

export type WorkflowVersionResponseDto = {
    id: string
    workflowId: string
    versionNumber: number
    revision: number
    status: WorkflowVersionStatus
    createdBy: string | null
    createdAt: string
    updatedAt: string
    publishedBy: string | null
    publishedAt: string | null
}

export type WorkflowGraphResponseDto = {
    workflowVersion: WorkflowVersionResponseDto
    nodes: NodeResponseDto[]
    edges: EdgeResponseDto[]
}