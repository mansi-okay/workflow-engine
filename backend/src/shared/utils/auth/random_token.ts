import { randomBytes } from "crypto"

export const generateRandomToken = (size = 32): string => {
    return randomBytes(size).toString("hex")
}