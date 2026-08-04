import { AuditLog, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export class AuditRepository{
    constructor(
        private readonly db: 
        PrismaClient |
        Prisma.TransactionClient = prisma
    ){}

    async create(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog>{
        return this.db.auditLog.create({data})
    }
}