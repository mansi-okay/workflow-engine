import { Invitation } from "@prisma/client";
import { InvitationResponseDto } from "../dtos/invitation_response.dto.js";

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