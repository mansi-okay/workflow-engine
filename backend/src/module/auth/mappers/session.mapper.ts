import { Session } from "@prisma/client";
import { SessionResponseDto } from "../dtos/session_response.dto.js";

export const toSessionResponseDto = (
    session: Session, 
    currentSessionId: string
): SessionResponseDto => ({
    id: session.id,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    deviceName: session.deviceName,
    createdAt: session.createdAt.toISOString(),
    lastUsedAt: session.lastUsedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    isCurrent: currentSessionId === session.id
})