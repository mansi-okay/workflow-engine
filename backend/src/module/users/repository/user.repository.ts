import { Prisma, PrismaClient, User } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";

export class UserRepository{

    constructor (private readonly db: 
        PrismaClient | 
        Prisma.TransactionClient = prisma
    ) {}

    async findByEmail(email: string): Promise<User | null>{
        return this.db.user.findUnique({
            where: {
                email,
                deletedAt: null
            }
        })
    }

    async create(data: Prisma.UserCreateInput): Promise<User>{
        return this.db.user.create({data})
    }

    async markEmailVerified(userId: string): Promise<User>{
        return this.db.user.update({
            where: {id: userId},
            data: {
                isEmailVerified: true
            } 
        })
    }
}