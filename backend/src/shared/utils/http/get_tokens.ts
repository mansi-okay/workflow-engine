import { Request } from "express";
import { UnauthorizedError } from "../../error/HttpErrors.js";

export const getRefreshToken = (req: Request): string => {
    const token = req.cookies?.refreshToken

    if(!token){
        throw new UnauthorizedError("Refresh token missing")
    }

    return token
}

export const getAccessToken = (req: Request): string => {
    const token = req.cookies?.accessToken ??
    req.header("Authorization")?.replace(/^Bearer\s+/i, "")

    if (!token) {
        throw new UnauthorizedError("Access token missing");
    }

    return token
}