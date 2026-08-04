import { User, Session, VerificationToken, Prisma } from "@prisma/client";

export interface RegisterResult {
    user: User
    accessToken: string
    refreshToken: string
}

export type VerificationTokenWithUser = Prisma.VerificationTokenGetPayload<{
    include: {
        user: true
    }
}>