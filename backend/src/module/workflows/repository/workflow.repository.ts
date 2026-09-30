import type { Prisma, PrismaClient, Workflow } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { decodeCursor, encodeCursor } from "../../../shared/utils/pagination/cursor.js";
import type { WorkflowListResult, WorkflowWithVersions } from "../types/workflow.types.js";
import type { WorkflowListQueryInput } from "../validations/workflow_list.schema.js";
import { workflowCursorSchema } from "../validations/workflow_cursor.schema.js";
import type { UpdateWorkflowMetadataBodyInput } from "../validations/update_workflow.schema.js";

export class WorkflowRepository {
    constructor(
        private readonly db :
        PrismaClient |
        Prisma.TransactionClient = prisma
    ){}

    async create(data: Prisma.WorkflowUncheckedCreateInput): Promise<Workflow>{
        return this.db.workflow.create({data})
    }

    async setCurrentDraft(
        workflowId: string,
        draftVersionId: string
    ): Promise<Workflow>{
        return this.db.workflow.update({
            where: {id: workflowId},
            data:{ currentDraftVersionId: draftVersionId }
        })
    }

    async findByOrganizationId(
        organizationId: string,
        {limit, cursor, search}: WorkflowListQueryInput
    ): Promise<WorkflowListResult>{
        const decodedCursor = cursor ? decodeCursor(cursor, workflowCursorSchema) : undefined

        const workflows = await this.db.workflow.findMany({
            where:{
                organizationId,
                deletedAt: null,
                ...(search && {
                    name: {
                        contains: search,
                        mode:"insensitive"
                    }
                }),
                ...(decodedCursor && {
                    OR: [
                        {
                            createdAt: {
                                lt: decodedCursor.timestamp
                            }
                        },
                        {
                            createdAt: decodedCursor.timestamp,
                            id:{
                                lt: decodedCursor.id
                            }
                        }
                    ]
                })
            },
            orderBy: [
                {createdAt: "desc"},
                {id: "desc"}
            ],
            take: limit+1
        })

        const hasNextPage = workflows.length > limit

        const items = hasNextPage
        ? workflows.slice(0,limit)
        : workflows

        const lastWorkflow = items[items.length-1]

        const nextCursor = hasNextPage && lastWorkflow
        ? encodeCursor({
            timestamp: lastWorkflow.createdAt,
            id: lastWorkflow.id
        })
        : null

        return {
            workflows: items,
            pagination: {
                nextCursor,
                hasNextPage
            }
        }
    }

    async findByIdAndOrganizationId(
        organizationId: string,
        id: string
    ): Promise<WorkflowWithVersions | null>{
        return this.db.workflow.findFirst({
            where:{
                id,
                organizationId,
                deletedAt: null
            },
            include: {
                currentDraftVersion: true,
                currentPublishedVersion: true
            }
        })
    }

    async findByIdAndOrganizationIdForUpdate(
        organizationId: string,
        workflowId: string
    ): Promise<Workflow | null>{
        const workflow = await this.db.$queryRaw<Workflow[]>`
        SELECT * FROM "Workflow"
        WHERE "id" = ${workflowId} 
        AND "organizationId" = ${organizationId} 
        AND "deletedAt" is NULL
        FOR UPDATE
        `

        return workflow[0] ?? null
    }

    async updateMetadata(
        organizationId: string,
        workflowId: string,
        data: UpdateWorkflowMetadataBodyInput
    ): Promise<boolean>{
        const result = await this.db.workflow.updateMany({
            where: {
                id: workflowId,
                organizationId,
                deletedAt: null
            },
            data
        })

        return result.count === 1
    }

    async softDelete(
        organizationId: string,
        workflowId: string
    ): Promise<boolean>{
        const result = await this.db.workflow.updateMany({
            where: {
                id: workflowId,
                organizationId,
                deletedAt: null
            },
            data:{
                deletedAt: new Date()
            }
        })

        return result.count === 1
    }

    async updateVersionPointers(
        organizationId: string,
        workflowId: string,
        publishedVersionId: string
    ): Promise<Workflow>{
        return this.db.workflow.update({
            where: {
                id: workflowId,
                organizationId,
                deletedAt: null
            },
            data: {
                currentPublishedVersionId: publishedVersionId,
                currentDraftVersionId: null,
            },
        })
    }
}