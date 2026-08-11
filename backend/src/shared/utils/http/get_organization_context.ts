import { Request } from "express"
import { NotFoundError } from "../../error/HttpErrors.js"
import { OrganizationContext } from "../../types/request_context.js"

export const getOrganizationContext = (req: Request): OrganizationContext => {
    if(!req.organization){
        throw new NotFoundError("Organization context not found")
    }

    return req.organization
}