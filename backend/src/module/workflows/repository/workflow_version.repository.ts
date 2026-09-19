import type { Prisma, PrismaClient, WorkflowVersion } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";

export class WorkflowVersionRepository {
    constructor(
        private readonly db :
        PrismaClient |
        Prisma.TransactionClient = prisma
    ){}

    async create(data: Prisma.WorkflowVersionUncheckedCreateInput): Promise<WorkflowVersion>{
        return this.db.workflowVersion.create({data})
    }
}