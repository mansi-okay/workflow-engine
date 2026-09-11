import { Role } from "@prisma/client"

export type InvitationResponseDto = {
    id: string
    email: string
    organizationId: string
    invitedById: string
    role: Role
    createdAt: string
    expiresAt: string
    revokedAt: string | null
    acceptedAt: string | null
}

export interface PublicInvitationResponseDto {
    email: string
    role: Role
    organization:{
        id: string,
        name: string
    }
    expiresAt: string
}