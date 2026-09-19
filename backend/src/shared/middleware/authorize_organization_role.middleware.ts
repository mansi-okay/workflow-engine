import { Role } from "@prisma/client";
import { AsyncController } from "../types/express.types.js";
import { NextFunction, Request, Response } from "express";
import { getMembershipContext } from "../utils/http/get_membership_context.js";
import { ForbiddenError } from "../error/HttpErrors.js";

export const authorizeOrganizationRole = (
    ...allowedRoles: Role[]
): AsyncController => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        const membership = getMembershipContext(req)

        if(!allowedRoles.includes(membership.role)){
            throw new ForbiddenError("You do not have permission to perform this action")
        }

        next()
    }
}