import { Request, Response } from "express";
import { AsyncController } from "../../../shared/types/express.types.js";
import { OrganizationService } from "../services/organization.service.js";
import { CreateOrganizationInput } from "../validations/create_organization.schema.js";
import { getAuthContext } from "../../../shared/utils/http/get_auth_context.js";
import { getSessionMetadata } from "../../../shared/utils/http/session_metadata.js";
import { toOrganizationResponseDto } from "../mappers/organization.mapper.js";
import { getOrganizationContext } from "../../../shared/utils/http/get_organization_context.js";
import { UpdateOrganizationInput } from "../validations/update_organization.schema.js";
import { MembershipService } from "../services/membership.service.js";
import { toMembershipResponseDto, toMembershipWithUserResponseDto } from "../mappers/membership.mapper.js";
import { UpdateMembershipBodyInput, UpdateMembershipParamsInput } from "../validations/update_membership.schema.js";
import { getMembershipContext } from "../../../shared/utils/http/get_membership_context.js";
import { TransferOwnershipParamsInput } from "../validations/transfer_ownership.schema.js";
import { RemoveMemberParamsInput } from "../validations/remove_member.schema.js";
import { LeaveOrganizationParamsInput } from "../validations/leave_organization.schema.js";

export class OrganizationController{
    constructor(
        private readonly organizationService: OrganizationService,
        private readonly membershipService: MembershipService
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

    getMembers: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const {id: organizationId} = getOrganizationContext(req)

        const memberships = await this.membershipService.getMembers(organizationId)

        const memberDtos = memberships.map(membership => toMembershipWithUserResponseDto(membership))

        res.status(200).json({
            success: true,
            message: "Organization members fetched successfully",
            data: {
                members: memberDtos
            }
        })
    }

    updateMember: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const {userId: currentUserId} = getAuthContext(req)
        const {organizationId, memberId} = req.params as UpdateMembershipParamsInput
        const {role: currentUserRole} = getMembershipContext(req)
        const {newRole} = req.body as UpdateMembershipBodyInput

        const metadata = getSessionMetadata(req)

        const result = await this.membershipService.updateMember(
            organizationId,
            memberId,
            currentUserRole,
            currentUserId,
            newRole,
            metadata,
            req.logger
        )

        res.status(200).json({
            success: true,
            message: "Member role updated successfully",
            data: { updatedMembership : toMembershipResponseDto(result)}
        })
    }

    transferOwnership: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const {userId: currentUserId} = getAuthContext(req)
        const {organizationId, memberId} = req.params as TransferOwnershipParamsInput
        const {id: currentOwnerMemberId} = getMembershipContext(req)

        const metadata = getSessionMetadata(req)

        const result = await this.membershipService.transferOwnership(
            organizationId,
            currentOwnerMemberId,
            memberId,
            currentUserId,
            metadata,
            req.logger
        )

        res.status(200).json({
            success: true,
            message: "Ownership transfered successfully",
            data: {
                previousOwner: toMembershipWithUserResponseDto(result.previousOwner),
                newOwner: toMembershipWithUserResponseDto(result.newOwner)
            }
        })
    }

    removeMember: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const {userId: currentUserId} = getAuthContext(req)
        const {organizationId, memberId} = req.params as RemoveMemberParamsInput
        const {role: currentUserRole} = getMembershipContext(req)

        const metadata = getSessionMetadata(req)

        const result = await this.membershipService.removeMember(
            organizationId,
            memberId,
            currentUserId,
            currentUserRole,
            metadata,
            req.logger
        )

        res.status(200).json({
            success: true,
            message: "Organization member removed successfully",
            data: {
                removedMember : toMembershipResponseDto(result)
            }
        })
    }

    leaveOrganization: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const {userId} = getAuthContext(req)
        const {id: memberId} = getMembershipContext(req)
        const {organizationId} = req.params as LeaveOrganizationParamsInput
        const metadata = getSessionMetadata(req)

        const result = await this.membershipService.leaveOrganization(
            organizationId,
            memberId,
            userId,
            metadata,
            req.logger
        )

        res.status(200).json({
            success: true,
            message: "User left organization successfully",
            data: {
                leftMember: toMembershipResponseDto(result)
            }
        })

    }
}