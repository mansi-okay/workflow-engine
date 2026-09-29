import type { Edge, Node, WorkflowVersion, WorkflowVersionStatus } from "@prisma/client"
import type { PaginationMeta } from "../../../shared/types/pagination.types.js"

export type WorkflowVersionWithGraph = {
    id: string
    workflowId: string
    versionNumber: number
    revision: number
    status: WorkflowVersionStatus
    createdBy: string | null
    createdAt: Date
    publishedAt: Date | null
    updatedAt: Date
    publishedBy: string | null
    nodes: Node[]
    edges: Edge[]
}

export type WorkflowVersionListResult = {
    workflowVersions: WorkflowVersion[]
    pagination: PaginationMeta
}