    token: z.string()
    .trim()
    .length(64)
    .regex(/^[a-f0-9]+$/i, "Invalid token format")