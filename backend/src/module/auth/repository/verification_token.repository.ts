import { Prisma, PrismaClient, VerificationToken, VerificationTokenType } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { VerificationTokenWithUser } from "../types/auth.types.js";
import { hashToken } from "../../../shared/utils/auth/token.js";

export class VerificationTokenRepository{
    constructor(private readonly db:
        PrismaClient |
        Prisma.TransactionClient = prisma
    ) {}

    async create(data: Prisma.VerificationTokenUncheckedCreateInput): Promise<VerificationToken> {
        return this.db.verificationToken.create({data})
    }   

    async findByRawToken(token: string): Promise<VerificationTokenWithUser | null> {
        return this.db.verificationToken.findUnique({
            where: {hashedToken: hashToken(token)},
            include: {user: true}
        })
    }

    async findByRawTokenForUpdate(token: string): Promise<VerificationTokenWithUser | null> {
        const result = await this.db.$queryRaw<VerificationToken[]>`
        SELECT * FROM "VerificationToken"
        WHERE "hashedToken" = ${hashToken(token)}
        FOR UPDATE
        `

        const verificationToken = result[0]

        if (!verificationToken){
            return null
        }

        const user = await this.db.user.findUnique({
            where: {
                id: verificationToken.userId
            }
        })

        if (!user) {
            return null
        }

        return {
            ...verificationToken,
            user
        }
    }
    
    async markUsed(tokenId: string): Promise<VerificationToken> {
        return this.db.verificationToken.update({
            where: {id: tokenId},
            data: {usedAt: new Date()}
        })
    }

    async deletActiveTokens(userId: string, type: VerificationTokenType): Promise<number>{
        const result = await this.db.verificationToken.deleteMany({
            where:{
                userId,
                type,
                usedAt:null
            }
        })

        return result.count
    }
}