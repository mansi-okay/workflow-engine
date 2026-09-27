import { Node, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { CreateNodeInput } from "../types/node.types.js";

export class NodeRepository{
    constructor(
        private readonly db :
        PrismaClient |
        Prisma.TransactionClient = prisma
    ){}

    async create(data: CreateNodeInput): Promise<Node>{
        return this.db.node.create({
            data: {
                workflowVersionId: data.workflowVersionId,
                nodeKey: data.nodeKey,
                type: data.type,
                config: data.config as Prisma.InputJsonValue,
                position: data.position ?? Prisma.JsonNull
            }
        })
    }

    async deleteNodes(
        workflowVersionId: string
    ): Promise<void>{
        await this.db.node.deleteMany({
            where:{
                workflowVersionId
            }
        })
    }

}