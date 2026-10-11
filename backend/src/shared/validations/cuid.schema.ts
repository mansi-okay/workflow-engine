import z from "zod";

export const cuidV1Schema = z.string().regex(
  /^c[a-z0-9]{24,}$/,
  "Invalid CUID v1 format"
)