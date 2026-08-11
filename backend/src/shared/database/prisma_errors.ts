import { Prisma } from "@prisma/client";

export const isPrismaUniqueConstraintError = (
    error: unknown,
    field: string
): boolean => {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes(field)
    )
}