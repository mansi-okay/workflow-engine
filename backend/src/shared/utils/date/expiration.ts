import ms from "ms"

export const createExpirationDate = (duration: ms.StringValue): Date => {
    return new Date(Date.now() + ms(duration))
}