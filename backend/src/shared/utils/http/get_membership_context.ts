import { Request } from "express";
import { MembershipContext } from "../../types/request_context.js";
import { NotFoundError } from "../../error/HttpErrors.js";

export const getMembershipContext = (req: Request): MembershipContext => {
    if(!req.membership){
        throw new NotFoundError("Membership not found")
    }

    return req.membership
}