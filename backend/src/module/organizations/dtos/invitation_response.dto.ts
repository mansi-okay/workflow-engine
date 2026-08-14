import { Role } from "@prisma/client"

export interface InvitationResponseDto {
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