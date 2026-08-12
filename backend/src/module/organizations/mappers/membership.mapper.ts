import { Membership } from "@prisma/client"
import { MembershipResponseDto, MembershipWithUserResponseDto } from "../dtos/membership_response.dto.js"
import { MembershipWithUser } from "../types/organization.types.js"

export const toMembershipWithUserResponseDto = (
    data: MembershipWithUser
): MembershipWithUserResponseDto => ({
    id: data.id,
    role: data.role,
    joinedAt: data.joinedAt.toISOString(),
    user: {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email
    }
})

export const toMembershipResponseDto = (data: Membership): MembershipResponseDto => ({
    id: data.id,
    userId: data.userId,
    organizationId: data.organizationId,
    role: data.role,
    joinedAt: data.joinedAt.toISOString()
})