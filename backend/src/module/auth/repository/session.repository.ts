import { Prisma, PrismaClient, Session } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";

export class SessionRepository{
    constructor (private readonly db:
        PrismaClient |
        Prisma.TransactionClient = prisma
    ) {}

    async create(data: Prisma.SessionUncheckedCreateInput): Promise<Session> {
        return this.db.session.create({data})
    }
}