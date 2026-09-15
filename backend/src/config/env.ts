import dotenv from "dotenv";
dotenv.config();
import {z} from "zod";
import { durationSchema } from "../shared/validators/env.validator.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development","production","test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.url(),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  ACCESS_TOKEN_SECRET: z.string().min(32, "ACCESS_TOKEN_SECRET is too short"),
  ACCESS_TOKEN_EXPIRY: durationSchema.default("15m"),
  REFRESH_TOKEN_SECRET: z.string().min(32, "REFRESH_TOKEN_SECRET is too short"),
  REFRESH_TOKEN_EXPIRY: durationSchema.default("7d"),
  TOKEN_HASH_SECRET: z.string().min(32, "TOKEN_HASH_SECRET is too short"),
  EMAIL_VERIFICATION_TOKEN_EXPIRY: durationSchema.default("24h"),
  PASSWORD_RESET_TOKEN_EXPIRY:durationSchema.default("30m"),
  INVITATION_TOKEN_EXPIRY:durationSchema.default("7d"),
  IDEMPOTENCY_KEY_EXPIRY:durationSchema.default("24h"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  EMAIL_FROM:z.email("EMAIL_FROM must be valid"),
  FRONTEND_URL: z.url().default("http://localhost:3000")
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment variables")
  console.error(parsed.error)
  process.exit(1)
}

export const env = parsed.data