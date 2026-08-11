import { Request } from "express"
import { UnauthorizedError } from "../../error/HttpErrors.js"
import { AuthContext } from "../../types/request_context.js"

export const getAuthContext = (req: Request): AuthContext => {
    if (!req.auth){
        throw new UnauthorizedError("Authentication required")
    }

    return req.auth
}