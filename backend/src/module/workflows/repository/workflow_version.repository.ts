import { WorkflowVersionStatus, type Prisma, type PrismaClient, type WorkflowVersion } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { WorkflowVersionWithGraph } from "../types/workflow.types.js";

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
                    organizationId
                }
            },
            include: {
                nodes: true,
                edges: true
            }
        })
    }

    async findDraftVersionByIdForUpdate(
        draftVersionId: string
    ): Promise<WorkflowVersion | null>{

        const draft = await this.db.$queryRaw<WorkflowVersion[]>`
        SELECT * FROM "WorkflowVersion"
        WHERE "id" = ${draftVersionId}
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

}