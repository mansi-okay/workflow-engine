import type { Edge, Node, Workflow, WorkflowVersion, WorkflowVersionStatus } from "@prisma/client"
import type { PaginationMeta } from "../../../shared/types/pagination.types.js"

export type CreateWorkflowResult = {
    workflow: Workflow
    workflowVersion: WorkflowVersion
}

export type WorkflowListResult = {
    workflows: Workflow[]
    pagination: PaginationMeta
}

export type WorkflowWithVersions = {
    id: string
    organizationId: string
    name: string
    description: string | null
    currentPublishedVersionId: string | null
    currentDraftVersionId: string | null
    createdBy: string | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    currentDraftVersion: WorkflowVersion | null
    currentPublishedVersion: WorkflowVersion | null
}

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

export type UpdateWorkflowGraphOutput = {
    draftVersionId: string
    revision: number
}