import { Request, Response, NextFunction } from "express";
import { SessionRepository } from "../../module/auth/repository/session.repository.js";
import { getAccessToken } from "../utils/http/get_tokens.js";
import { verifyAccessToken } from "../utils/auth/token.js";
import { UnauthorizedError } from "../error/HttpErrors.js";
import { AsyncController } from "../types/express.types.js";

export const authenticate = (
    sessionRepository: SessionRepository
): AsyncController => {
    return async(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {

        const accessToken = getAccessToken(req)

        const payload = verifyAccessToken(accessToken)

        const userId = payload.sub
        const sessionId = payload.sid

        const session = await sessionRepository.findByIdWithUser(sessionId)

        if(!session){
            throw new UnauthorizedError("Invalid access token")
        }

        if (session.userId !== userId){
            throw new UnauthorizedError("Invalid access token")
        }

        if(session.user.deletedAt){
            throw new UnauthorizedError("Invalid access token")
        }

        if(session.revokedAt){
            throw new UnauthorizedError("Invalid access token")
        }

        req.auth = {
            userId,
            sessionId
        }

        next()
    }
}