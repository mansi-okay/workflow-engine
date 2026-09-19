import { Prisma, Role, type Invitation, type Organization } from "@prisma/client";
import type { PaginationMeta } from "../../../shared/types/pagination.types.js";

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
    revokedAt: Date | null
    acceptedAt: Date | null
}

export type InvitationListResult = {
    invitations: Invitation[]
    pagination: PaginationMeta
}

export type OrganizationListResult = {
    organizations: Organization[]
    pagination: PaginationMeta
}

export type MembershipListResult = {
    members: MembershipWithUser[]
    pagination: PaginationMeta
}