import jwt, { SignOptions } from "jsonwebtoken"
import { AccessTokenPayload, RefreshTokenPayload } from "../../types/auth.types.js"
import { env } from "../../../config/env.js"
import crypto from "crypto"
import { UnauthorizedError } from "../../error/HttpErrors.js"

export const generateAccessToken = (payload: AccessTokenPayload): string => {
    return jwt.sign(
        payload,
        env.ACCESS_TOKEN_SECRET, 
        { expiresIn: env.ACCESS_TOKEN_EXPIRY as SignOptions["expiresIn"] }
    )
}

export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
    return jwt.sign(
        payload,
        env.REFRESH_TOKEN_SECRET,
        { expiresIn: env.REFRESH_TOKEN_EXPIRY as SignOptions["expiresIn"] }
    )
}

export const verifyAccessToken = (token: string): AccessTokenPayload => {  
    try {
        return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload
    } catch {
        throw new UnauthorizedError("Invalid access token")
    }
}

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
    try {
        return jwt.verify(token,env.REFRESH_TOKEN_SECRET) as RefreshTokenPayload
    } catch {
        throw new UnauthorizedError("Invalid refresh token")  
    }
}

export const hashToken = (token: string): string => {
  return crypto.createHmac("sha256", env.TOKEN_HASH_SECRET).update(token).digest("hex")
}

export const verifyTokenHash = (token: string, hashedToken: string): boolean => {
    const computedHash = hashToken(token)
    return crypto.timingSafeEqual(
        Buffer.from(computedHash,"hex"),
        Buffer.from(hashedToken,"hex")
    )
}