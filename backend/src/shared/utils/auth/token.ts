import jwt, { SignOptions } from "jsonwebtoken"
import { AccessTokenPayload, RefreshTokenPayload } from "../../types/auth.types.js"
import { env } from "../../../config/env.js"
import crypto from "crypto"

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
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload
}

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
    return jwt.verify(token,env.REFRESH_TOKEN_SECRET) as RefreshTokenPayload
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