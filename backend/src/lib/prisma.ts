import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";

const connectionString = `${env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })

export const prisma = new PrismaClient({ adapter })