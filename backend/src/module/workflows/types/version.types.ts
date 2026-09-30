import type { Edge, Node, Prisma, WorkflowVersion } from "@prisma/client"
import type { PaginationMeta } from "../../../shared/types/pagination.types.js"

export type WorkflowVersionWithGraph = Prisma.WorkflowVersionGetPayload<{
        include: {
            nodes: true
            edges: {
                include: {
                    sourceNode: true
                    targetNode: true
                }
            }
        }
    }>

export type WorkflowVersionListResult = {
    workflowVersions: WorkflowVersion[]
    pagination: PaginationMeta
}