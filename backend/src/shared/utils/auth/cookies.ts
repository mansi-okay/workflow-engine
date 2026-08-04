import { CookieOptions, Response } from "express";
import { env } from "../../../config/env.js";
import { createExpirationDate } from "../date/expiration.js";

const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict"
}

export const setAuthCookies = (
    res: Response,
    accessToken: string,
    refreshToken: string
) => {
    res.cookie("accessToken",accessToken,{
        ...cookieOptions,
        expires: createExpirationDate(env.ACCESS_TOKEN_EXPIRY)
    })
    res.cookie("refreshToken",refreshToken,{
        ...cookieOptions,
        expires: createExpirationDate(env.REFRESH_TOKEN_EXPIRY)
    })
}

export const clearAuthCookies = (res: Response): void => {
    res.clearCookie("accessToken", cookieOptions)

    res.clearCookie("refreshToken", cookieOptions)
} 