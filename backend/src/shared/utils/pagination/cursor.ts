import type { Cursor } from "../../types/pagination.types.js"

export const encodeCursor = (
    data: Cursor
): string => {
    return Buffer.from(JSON.stringify(data)).toString("base64url")
}

export const decodeCursor = (cursor: string) : Cursor => {
    const decoded = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf-8")
    )

    return {
        timestamp: new Date(decoded.timestamp),
        id: decoded.id
    }
}

export const encodeSessionCursor = (
    data: {
        lastUsedAt: Date
        createdAt: Date
        id: string
    }
): string => {
    return Buffer.from(JSON.stringify(data)).toString("base64url")
}

export const decodeSessionCursor = (cursor: string) : {
    lastUsedAt: Date
    createdAt: Date
    id: string
} => {
    const decoded = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf-8")
    )

    return {
        lastUsedAt: new Date(decoded.lastUsedAt),
        createdAt: new Date(decoded.createdAt),
        id: decoded.id
    }
}