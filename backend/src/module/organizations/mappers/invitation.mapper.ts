import { Invitation } from "@prisma/client";
import { InvitationResponseDto, PublicInvitationResponseDto } from "../dtos/invitation_response.dto.js";
import { PublicInvitation } from "../types/organization.types.js";

export const toInvitationResponseDto = (data: Invitation): InvitationResponseDto => ({
    id: data.id,
    email: data.email,
    organizationId: data.organizationId,
    invitedById: data.invitedById,
    role: data.role,
    createdAt: data.createdAt.toISOString(),
    expiresAt: data.expiresAt.toISOString(),
    revokedAt: data.revokedAt?.toISOString() ?? null,
    acceptedAt: data.acceptedAt?.toISOString() ?? null
})

export const toPublicInvitationResponseDto = (
    data: PublicInvitation
): PublicInvitationResponseDto => ({
    email: data.email,
    role: data.role,
    organization:{
        id: data.organization.id,
        name: data.organization.name
    },
    expiresAt: data.expiresAt.toISOString()
})