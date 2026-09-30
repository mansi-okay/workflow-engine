import { WorkflowVersionStatus, type Prisma, type PrismaClient, type WorkflowVersion } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { PaginationInput } from "../../../shared/validators/pagination.schema.js";
import type { WorkflowVersionListResult, WorkflowVersionWithGraph } from "../types/version.types.js";
import { decodeCursor, encodeCursor } from "../../../shared/utils/pagination/cursor.js";
import { workflowVersionCursorSchema } from "../validations/workflow_version_cursor.schema.js";

export class WorkflowVersionRepository {
    constructor(
        private readonly db :
        PrismaClient |
        Prisma.TransactionClient = prisma
    ){}

    async create(data: Prisma.WorkflowVersionUncheckedCreateInput): Promise<WorkflowVersion>{
        return this.db.workflowVersion.create({data})
    }

    async findDraftGraphByWorkflowIdAndOrganizationId(
        organizationId: string,
        workflowId: string
    ): Promise<WorkflowVersionWithGraph | null>{
        return this.db.workflowVersion.findFirst({
            where: {
                workflowId,
                status: WorkflowVersionStatus.DRAFT,
                workflow: {
                    organizationId,
                    deletedAt: null
                }
            },
            include: {
                nodes: true,
                edges: {
                    include: {
                        sourceNode: true,
                        targetNode: true
                    }
                }
            }
        })
    }

    async findDraftVersionByIdForUpdate(
        draftVersionId: string
    ): Promise<WorkflowVersion | null>{

        const draft = await this.db.$queryRaw<WorkflowVersion[]>`
        SELECT * FROM "WorkflowVersion"
        WHERE "id" = ${draftVersionId}
        AND "status" = 'DRAFT'
        FOR UPDATE 
        `
        return draft[0] ?? null
    }

    async incrementDraftRevisionIfCurrent(
        workflowVersionId: string,
        expectedRevision: number
    ): Promise<boolean>{
        const result = await this.db.workflowVersion.updateMany({
            where: {
                id: workflowVersionId,
                status: WorkflowVersionStatus.DRAFT,
                revision: expectedRevision
            },
            data:{
                revision: {increment:1}
            }
        })

        return result.count === 1
    }

    async findVersionsByWorkflowIdAndOrganizationId(
        workflowId: string,
        organizationId: string,
        {limit, cursor}: PaginationInput
    ): Promise<WorkflowVersionListResult>{

        const decodedCursor = cursor ? decodeCursor(cursor, workflowVersionCursorSchema) : undefined

        const versions = await this.db.workflowVersion.findMany({
            where: {
                workflowId,
                workflow: {
                    organizationId,
                    deletedAt: null
                },
                ...(decodedCursor && {
                            versionNumber: {
                                lt: decodedCursor.versionNumber
                            }
                        }
                )
            },
            orderBy: {versionNumber: "desc"},
            take: limit+1
        })

        const hasNextPage = versions.length > limit

        const items = hasNextPage 
        ? versions.slice(0, limit)
        : versions

        const lastWorkflowVersion = items[items.length-1]

        const nextCursor = hasNextPage && lastWorkflowVersion
        ? encodeCursor({
            versionNumber: lastWorkflowVersion.versionNumber
        })
        : null

        return {
            workflowVersions: items,
            pagination: {
                nextCursor,
                hasNextPage
            }
        }
    }

    async findByIdAndWorkflowIdAndOrganizationId(
        organizationId: string,
        workflowId: string,
        workflowVersionId: string
    ): Promise<WorkflowVersion | null>{
        return this.db.workflowVersion.findFirst({
            where: {
                id: workflowVersionId,
                workflowId,
                workflow:{
                    organizationId,
                    deletedAt: null
                }
            }
        })
    }

    async findGraphByIdAndWorkflowIdAndOrganizationId(
        organizationId: string,
        workflowId: string,
        workflowVersionId: string
    ): Promise<WorkflowVersionWithGraph | null>{
        return this.db.workflowVersion.findFirst({
            where:{
                id: workflowVersionId,
                workflowId,
                workflow: {
                    organizationId,
                    deletedAt: null
                }
            },
            include: {
                nodes: true,
                edges: {
                    include: {
                        sourceNode: true,
                        targetNode: true
                    }
                }
            }
        })
    }

    async findLatestVersionNumber(
        workflowId: string
    ): Promise<number>{
        const latestVersion = await this.db.workflowVersion.findFirst({
            where: {
                workflowId
            },
            orderBy: {
                versionNumber: "desc"
            },
            select: {
                versionNumber: true
            }
        })

        return latestVersion?.versionNumber ?? 0
    }

    async findPublishedGraphByIdAndWorkflowIdAndOrganizationId(
        organizationId: string,
        workflowId: string,
        workflowVersionId: string
    ): Promise<WorkflowVersionWithGraph | null>{
        return this.db.workflowVersion.findFirst({
            where:{
                id: workflowVersionId,
                workflowId,
                status: WorkflowVersionStatus.PUBLISHED,
                workflow: {
                    organizationId,
                    deletedAt: null
                }
            },
            include: {
                nodes: true,
                edges: {
                    include: {
                        sourceNode: true,
                        targetNode: true
                    }
                }
            }
        })
    }

    async findDraftGraphByIdAndWorkflowIdAndOrganizationId(
        organizationId: string,
        workflowId: string,
        workflowVersionId: string
    ): Promise<WorkflowVersionWithGraph | null>{
        return this.db.workflowVersion.findFirst({
            where:{
                id: workflowVersionId,
                workflowId,
                status: WorkflowVersionStatus.DRAFT,
                workflow: {
                    organizationId,
                    deletedAt: null
                }
            },
            include: {
                nodes: true,
                edges: {
                    include: {
                        sourceNode: true,
                        targetNode: true
                    }
                }
            }
        })
    }

    async archiveVersion(
        publishedVersionId: string,
        organizationId: string,
        workflowId: string
    ): Promise<boolean>{
        const result =  await this.db.workflowVersion.updateMany({
            where:{
                id: publishedVersionId,
                workflowId,
                workflow:{
                    organizationId,
                    deletedAt: null
                },
                status: WorkflowVersionStatus.PUBLISHED
            },
            data: {
                status: WorkflowVersionStatus.ARCHIVED
            }
        })

        return result.count === 1
    }

    async publishVersion(
        draftVersionId: string,
        organizationId: string,
        currentUserId: string,
        workflowId: string  
    ): Promise<boolean>{
        const result = await this.db.workflowVersion.updateMany({
            where: {
                id: draftVersionId,
                workflowId,
                workflow:{
                    organizationId,
                    deletedAt: null
                },
                status: WorkflowVersionStatus.DRAFT                
            },
            data: {
                status: WorkflowVersionStatus.PUBLISHED,
                publishedBy: currentUserId,
                publishedAt: new Date()
            }
        })

        return result.count === 1
    }
}