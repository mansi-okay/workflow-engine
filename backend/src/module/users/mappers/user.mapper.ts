import { User } from "@prisma/client";
import { UserResponseDto } from "../dtos/user_response.dto.js";

export const toUserResponseDto = (user: User): UserResponseDto => ({
    id: user.id,
    name: user.name,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt
})