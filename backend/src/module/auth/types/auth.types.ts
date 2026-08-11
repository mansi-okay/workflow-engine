import { User, Prisma, Session } from "@prisma/client";

export interface AccessTokenPayload{
    sub: string,
    sid: string,
    type: "access"
}

export interface RefreshTokenPayload{
    sub: string,
    sid:string,
    type:"refresh"
}

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