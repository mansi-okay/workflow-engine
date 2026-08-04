import ms from "ms"
import z from "zod"

export const durationSchema = z.string()
.refine((value) => ms(value as ms.StringValue) !== undefined,"Invalid duration format")
.transform((value) => value as ms.StringValue)