import type { Prisma } from "@prisma/client";
import type { JsonValue } from "../../types/json.types.js";

export const toJsonValue = (value: Prisma.JsonValue): JsonValue => {
    if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return value
    }

    if (Array.isArray(value)) {
        return value.map(toJsonValue)
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => {
            if (nestedValue === undefined) {
                throw new Error(`Unexpected undefined JSON value at key: ${key}`)
            }

            return [key, toJsonValue(nestedValue)]
        })
    )
}
