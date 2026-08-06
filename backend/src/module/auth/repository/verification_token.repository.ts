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

    async markUsed(tokenId: string): Promise<VerificationToken> {
        return this.db.verificationToken.update({
            where: {id: tokenId},
            data: {usedAt: new Date()}
        })
    }

    async deleteActiveEmailVerificationTokens(userId: string) {
        return this.db.verificationToken.deleteMany({
            where: {
                userId,
                type: VerificationTokenType.EMAIL_VERIFICATION,
                usedAt: null
            }
        })
    }
}