import { Session } from "@prisma/client";
import { SessionResponseDto } from "../dtos/session_response.dto.js";

export const toSessionResponseDto = (
    session: Session, 
    currentSessionId: string
): SessionResponseDto => ({
    id: session.id,
    ipAddress: session.ipAddress ?? undefined,
    userAgent: session.userAgent ?? undefined,
    deviceName: session.deviceName ?? undefined,
    createdAt: session.createdAt.toISOString(),
    lastUsedAt: session.lastUsedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    isCurrent: currentSessionId === session.id
})