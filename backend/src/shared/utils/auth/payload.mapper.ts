import { User } from "@prisma/client";
import { AccessTokenPayload, RefreshTokenPayload } from "../../../module/auth/types/auth.types.js";

export const toAccessPayload = (user : User, sessionId: string): AccessTokenPayload => ({
    sub: user.id,
    sid: sessionId,
    type: "access"
})

export const toRefreshPayload = (user: User, sessionId: string): RefreshTokenPayload => ({
    sub: user.id,
    sid: sessionId,
    type: "refresh"
})