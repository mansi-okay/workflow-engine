import dotenv from "dotenv";
dotenv.config();
import {z} from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development","production","test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.url()
})  

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment variables")
  console.error(parsed.error)
  process.exit(1)
}

export const env = parsed.data