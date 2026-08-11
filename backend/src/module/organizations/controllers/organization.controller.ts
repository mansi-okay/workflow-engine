import { Request, Response } from "express";
import { AsyncController } from "../../../shared/types/express.types.js";
import { OrganizationService } from "../services/organization.service.js";
import { CreateOrganizationInput } from "../validations/create_organization.schema.js";
import { getAuthContext } from "../../../shared/utils/http/get_auth_context.js";
import { getSessionMetadata } from "../../../shared/utils/http/session_metadata.js";
import { toOrganizationResponseDto } from "../mappers/organization.mapper.js";
import { getOrganizationContext } from "../../../shared/utils/http/get_organization_context.js";
import { UpdateOrganizationInput } from "../validations/update_organization.schema.js";

export class OrganizationController{
    constructor(
        private readonly organizationService: OrganizationService
    ){}

    createOrganization: AsyncController = async (req: Request, res: Response): Promise<void> => {
        const data = req.body as CreateOrganizationInput

        const auth = getAuthContext(req)
        const metadata = getSessionMetadata(req)

        const result = await this.organizationService.createOrganization(
            data,
            auth,
            metadata,
            req.logger
        )

        res.status(201).json({
            success: true,
            message: "Organization created successfully",
            data: {
                organization : toOrganizationResponseDto(result)
            }
        })
    }

    getOrganizations: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const {userId} = getAuthContext(req)

        const organizations = await this.organizationService.getOrganizations(userId)

        const organizationDtos = organizations.map(organization => 
            toOrganizationResponseDto(organization)
        )

        res.status(200).json({
            success: true,
            message: "Fetched organizations successfully",
            data: {
                organizations: organizationDtos
            }
        })
    }

    getOrganizationById: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const {id: organizationId} = getOrganizationContext(req)

        const organization = await this.organizationService.getOrganizationById(
            organizationId
        )

        res.status(200).json({
            success: true,
            message: "Organization fetched successfully",
            data: {
                organization: toOrganizationResponseDto(organization)
            }
        })
    }

    updateOrganization: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const data = req.body as UpdateOrganizationInput
        const {id: organizationId} = getOrganizationContext(req)
        const {userId} = getAuthContext(req)
        const metadata = getSessionMetadata(req)

        const organization = await this.organizationService.updateOrganization(
            organizationId,
            userId,
            data,
            metadata,
            req.logger
        )

        res.status(200).json({
            success: true,
            message: "Organization data updated successfully",
            data: {
                organization: toOrganizationResponseDto(organization)
            }
        })
    }

    deleteOrganization: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const {id: organizationId} = getOrganizationContext(req)
        const {userId} = getAuthContext(req)
        const metadata = getSessionMetadata(req)

        await this.organizationService.deleteOrganization(
            organizationId,
            userId,
            metadata,
            req.logger
        )

        res.status(204).send()
    }
}