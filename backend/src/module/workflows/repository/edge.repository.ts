import type { Edge, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { CreateEdgeInput } from "../types/edge.types.js";

export class EdgeRepository{
    constructor(
        private readonly db :
        PrismaClient |
        Prisma.TransactionClient = prisma
    ){}

    async create(data : CreateEdgeInput): Promise<Edge>{
        return this.db.edge.create({data})
    }

    async deleteEdges(
        workflowVersionId: string
    ): Promise<void>{
        await this.db.edge.deleteMany({
            where: {
                workflowVersionId
            }
        })
    }

}