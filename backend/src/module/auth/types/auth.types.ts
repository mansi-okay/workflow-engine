import { User, Prisma, Session } from "@prisma/client";

export interface AuthResult {
    user: User
    accessToken: string
    refreshToken: string
}

export type VerificationTokenWithUser = Prisma.VerificationTokenGetPayload<{
    include: {
        user: true
    }
}>

export interface SessionResult {
    session: Session
    accessToken: string
    refreshToken: string
}

export type SessionWithUser = Prisma.SessionGetPayload<{
    include: {
        user: true
    }
}>

export interface SessionsResult {
    currentSessionId: string
    sessions: Session[]
}

export interface SessionAuthentication {
    currentUserId: string
    currentSessionId: string
    session: SessionWithUser
}