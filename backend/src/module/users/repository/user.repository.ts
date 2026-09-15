import { Prisma, PrismaClient, User } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { isPrismaUniqueConstraintError } from "../../../shared/database/prisma_errors.js";
import { ConflictError } from "../../../shared/error/HttpErrors.js";

export class UserRepository{

    constructor (private readonly db: 
        PrismaClient | 
        Prisma.TransactionClient = prisma
    ) {}

    async findByEmail(email: string): Promise<User | null>{
        return this.db.user.findFirst({
            where: {
                email,
                deletedAt: null
            }
        })
    }

    async findByEmailForUpdate(email: string): Promise<User | null>{
        const result = await this.db.$queryRaw<User[]>`
        SELECT * FROM "User"
        WHERE "email" = ${email} AND "deletedAt" IS NULL
        FOR UPDATE
        `
        return result[0] ?? null
    }

    async create(data: Prisma.UserCreateInput): Promise<User>{
        try {
            return await this.db.user.create({data})
        } catch (error) {
            if (isPrismaUniqueConstraintError(error,["email"])){
                throw new ConflictError("Email already exists")
            }

            throw error
        }
    }

    async markEmailVerified(userId: string): Promise<User>{
        return this.db.user.update({
            where: {id: userId},
            data: {
                isEmailVerified: true
            } 
        })
    }

    async findById(userId: string): Promise<User | null>{
        return this.db.user.findUnique({
            where: {id: userId}
        })
    }

    async updatePassword(userId: string, hashedPassword: string): Promise<User | null>{
        return this.db.user.update({
            where: {id: userId},
            data: {
                hashedPassword
            }
        })
    }
}