import { Role } from "@prisma/client";

export interface AccessTokenPayload{
    sub: string,
    sid: string,
    type: "access",
    orgId?: string,
    orgRole?:Role
}

export interface RefreshTokenPayload{
    sub: string,
    sid:string,
    type:"refresh"
}