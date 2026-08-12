import { NextFunction, Request, Response } from "express"
import { AsyncController } from "../../../shared/types/express.types.js"
import { OrganizationParamsInput } from "../validations/organization_params.schema.js"
import { MembershipRepository } from "../repository/membership.repository.js"
import { getAuthContext } from "../../../shared/utils/http/get_auth_context.js"
import { NotFoundError } from "../../../shared/error/HttpErrors.js"

export const loadOrganizationContext = (
    membershipRepository: MembershipRepository
): AsyncController => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        const {organizationId} = req.params as OrganizationParamsInput
        const {userId} = getAuthContext(req)

        const membership = await membershipRepository.findByUserAndOrganization(
            userId,
            organizationId
        )

        if(!membership || membership.organization.deletedAt){
            throw new NotFoundError("Organization not found")
        }

        req.organization = {
            id: membership.organization.id,
            name: membership.organization.name,
            slug: membership.organization.slug,
        }

        req.membership = {
            id: membership.id,
            userId: membership.userId,
            organizationId: membership.organizationId,
            role: membership.role,
        }

        next()
    }
}