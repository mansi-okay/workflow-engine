import { Prisma, Role } from "@prisma/client";

export type MembershipWithOrganization = Prisma.MembershipGetPayload<{
    include: {
        organization: true
    }
}>

export type UpdateOrganizationData = {
    name?: string
    slug?: string
    description?: string | null
}

export interface MembershipWithUser {
    id: string
    userId: string
    organizationId: string
    role: Role
    joinedAt: Date
    user: {
        id: string
        name: string
        email: string
    }
}

export interface TransferOwnership{
    previousOwner: MembershipWithUser
    newOwner: MembershipWithUser
}

export interface PublicInvitation {
    email: string
    role: Role
    organization: {
        id: string,
        name: string
    }
    expiresAt: Date,
    revokedAt: Date | null,
    acceptedAt: Date | null
}