import type z from "zod"
import { BadRequestError } from "../../error/HttpErrors.js"

export const encodeCursor = <T>(data: T): string => {
    return Buffer.from(JSON.stringify(data)).toString("base64url")
}

export const decodeCursor = <T>(
    cursor: string,
    schema: z.ZodType<T>
) : T => {
    try {

        const decoded = JSON.parse(
            Buffer.from(cursor, "base64url").toString("utf-8")
        )

        const result = schema.safeParse(decoded)

        if (!result.success){
            throw new BadRequestError("Invalid pagination cursor")
        }
    
        return result.data
    } catch (error) {
        if (error instanceof BadRequestError){
            throw error
        }
        throw new BadRequestError("Invalid pagination cursor")
    }
}